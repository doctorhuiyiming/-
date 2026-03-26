import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    original_language = Column(String, default="中文")
    target_region = Column(String, nullable=False)
    extract_method = Column(String, default="参考生成")
    has_character_recognition = Column(Boolean, default=False)
    status = Column(String, default="解析中")
    notes = Column(String, nullable=True)
    episode_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assets = relationship("Asset", back_populates="project", cascade="all, delete-orphan")
    slices = relationship("Slice", back_populates="project", cascade="all, delete-orphan")
    audio_tracks = relationship("AudioTrack", back_populates="project", cascade="all, delete-orphan")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    asset_type = Column(String, nullable=False)  # "character", "scene", "prop"
    original_name = Column(String, nullable=False)
    original_description = Column(String, nullable=False)
    original_image_url = Column(String, nullable=True)
    new_name = Column(String, nullable=True)
    new_description = Column(String, nullable=True)
    new_image_url = Column(String, nullable=True)
    is_confirmed = Column(Boolean, default=False)

    project = relationship("Project", back_populates="assets")


class Slice(Base):
    __tablename__ = "slices"

    id = Column(String, primary_key=True)  # format: "{project_id}_{slice_index}"
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    slice_index = Column(String, nullable=False)  # e.g. "1-1"
    time_start = Column(String, nullable=False)
    time_end = Column(String, nullable=False)
    original_description = Column(String, nullable=False)
    original_dialogue = Column(String, nullable=False)  # JSON string
    ai_video_url = Column(String, nullable=True)
    ai_description = Column(String, nullable=True)
    prompt = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, generating, completed, failed
    vbench_score = Column(Integer, nullable=True)
    adopted_task_id = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="slices")
    tasks = relationship("GenerationTask", back_populates="slice", cascade="all, delete-orphan")


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    slice_id = Column(String, ForeignKey("slices.id"), nullable=False)
    project_id = Column(String, nullable=False)
    prompt = Column(String, nullable=False)
    status = Column(String, default="queued")  # queued, generating, completed, failed
    video_url = Column(String, nullable=True)
    vbench_score = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    slice = relationship("Slice", back_populates="tasks")


class AudioTrack(Base):
    __tablename__ = "audio_tracks"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    track_type = Column(String, nullable=False)  # "translated_voice", "original_voice", "bgm"
    asset_url = Column(String, nullable=True)
    offset_ms = Column(Integer, default=0)
    is_muted = Column(Boolean, default=False)
    label = Column(String, nullable=True)

    project = relationship("Project", back_populates="audio_tracks")
