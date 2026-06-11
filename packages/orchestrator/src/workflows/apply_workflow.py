"""Temporal workflow: main apply pipeline.

This is the durable orchestrator that runs the full
scrape → match → apply → log pipeline with retries,
timeouts, and manual CAPTCHA resolution.
"""

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from ..activities.scrape_activity import scrape_jobs
    from ..activities.match_activity import match_jobs
    from ..activities.apply_activity import apply_to_job
    from ..activities.log_activity import log_application

retry_policy = RetryPolicy(
    max_attempts=3,
    initial_interval=timedelta(seconds=2),
    maximum_interval=timedelta(seconds=30),
    backoff_coefficient=2.0,
)


@workflow.defn
class ApplyWorkflow:
    """Main workflow: scrape jobs, match to profile, apply, log results.

    Supports:
    - Cron scheduling (9am & 2pm weekdays)
    - Durable timers for human-like delays between applies
    - Signal handlers for manual CAPTCHA resolution
    - Child workflow per job (isolated failures)
    """

    @workflow.run
    async def run(self, config: dict) -> dict:
        """Execute the full pipeline."""
        # 1. Scrape
        jobs = await workflow.execute_activity(
            scrape_jobs,
            config,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        # 2. Match
        matched = await workflow.execute_activity(
            match_jobs,
            {"jobs": jobs, "config": config},
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=retry_policy,
        )

        # 3. Apply to each matched job
        results = []
        for job_match in matched:
            # Human-like delay between applications (1-4 minutes)
            delay = workflow.random() * 180 + 60  # 60-240 seconds
            await workflow.sleep(timedelta(seconds=delay))

            result = await workflow.execute_activity(
                apply_to_job,
                {"job": job_match, "config": config},
                start_to_close_timeout=timedelta(minutes=3),
                retry_policy=retry_policy,
            )
            results.append(result)

            # 4. Log each result
            await workflow.execute_activity(
                log_application,
                result,
                start_to_close_timeout=timedelta(seconds=10),
            )

        return {
            "total_scraped": len(jobs),
            "total_matched": len(matched),
            "total_applied": len([r for r in results if r.get("success")]),
            "total_failed": len([r for r in results if not r.get("success")]),
        }

    @workflow.signal
    async def captcha_solved(self) -> None:
        """Signal from dashboard that a CAPTCHA has been manually solved."""
        # TODO: Resume the paused apply activity
        pass
