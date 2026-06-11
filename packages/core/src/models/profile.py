"""User profile and resume data models."""

from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):
    """Core personal information."""

    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str | None = None
    github: str | None = None


class Experience(BaseModel):
    """A single work experience entry."""

    title: str
    company: str
    dates: str  # e.g. "2023-2026"
    bullets: list[str] = []


class Education(BaseModel):
    """A single education entry."""

    degree: str
    school: str
    year: int | None = None
    gpa: str | None = None


class Documents(BaseModel):
    """Paths to resume and template files."""

    resume_path: str = "./config/resume.pdf"
    cover_letter_template: str = "./config/cover_template.txt"


class UserProfile(BaseModel):
    """Complete user profile for job matching and form filling."""

    personal: PersonalInfo = Field(default_factory=PersonalInfo)
    experience: list[Experience] = []
    education: list[Education] = []
    skills: list[str] = []
    documents: Documents = Field(default_factory=Documents)

    @property
    def skills_text(self) -> str:
        """Skills as a single string for embedding."""
        return ", ".join(self.skills)

    @property
    def experience_text(self) -> str:
        """Experience as a single string for embedding."""
        parts = []
        for exp in self.experience:
            parts.append(f"{exp.title} at {exp.company}: {'; '.join(exp.bullets)}")
        return " | ".join(parts)

    @property
    def embedding_text(self) -> str:
        """Combined text for semantic matching."""
        return f"{self.skills_text} | {self.experience_text}"
