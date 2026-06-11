"""Temporal worker entrypoint.

Run with: python -m job_applier_orchestrator.worker
"""

import asyncio
from temporalio.client import Client
from temporalio.worker import Worker

from .workflows.apply_workflow import ApplyWorkflow
from .activities.activities import scrape_jobs, match_jobs, apply_to_job, log_application


async def main():
    """Start the Temporal worker connecting to the local server."""
    client = await Client.connect("localhost:7233")

    worker = Worker(
        client,
        task_queue="job-applier-queue",
        workflows=[ApplyWorkflow],
        activities=[scrape_jobs, match_jobs, apply_to_job, log_application],
    )

    print("Starting Temporal worker...")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
