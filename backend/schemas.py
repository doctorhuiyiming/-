from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ─── Project Schemas ──────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    original_language: str = "中文"
    target_region: str
    extract_method: str = "参考生成"
    has_character_recognition: bool = False
    notes: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    target_region: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    original_language: str
    target_region: str
    extract_method: str
    has_character_recognition: bool
    status: str
    notes: Optional[str]
    episode_count: int
    created_at: datetime
    updated_at: datetime

    # computed stats
    slice_count: int = 0
    completed_count: int = 0
    failed_count: int = 0

    class Config:
        from_attributes = True


# ─── Asset Schemas ────────────────────────────────────────────────────────────

class AssetUpdate(BaseModel):
    new_name: Optional[str] = None
    new_description: Optional[str] = None
    new_image_url: Optional[str] = None
    is_confirmed: Optional[bool] = None


class AssetResponse(BaseModel):
    id: str
    project_id: str
    asset_type: str
    original_name: str
    original_description: str
    original_image_url: Optional[str]
    new_name: Optional[str]
    new_description: Optional[str]
    new_image_url: Optional[str]
    is_confirmed: bool

    class Config:
        from_attributes = True


# ─── Generation Task Schemas ──────────────────────────────────────────────────

class GenerationTaskResponse(BaseModel):
    id: str
    slice_id: str
    project_id: str
    prompt: str
    status: str
    video_url: Optional[str]
    vbench_score: Optional[int]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Slice Schemas ────────────────────────────────────────────────────────────

class SliceUpdate(BaseModel):
    prompt: Optional[str] = None
    original_description: Optional[str] = None
    ai_description: Optional[str] = None


class SliceResponse(BaseModel):
    id: str
    project_id: str
    slice_index: str
    time_start: str
    time_end: str
    original_description: str
    original_dialogue: str  # JSON string
    ai_video_url: Optional[str]
    ai_description: Optional[str]
    prompt: Optional[str]
    status: str
    vbench_score: Optional[int]
    adopted_task_id: Optional[str]
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    tasks: List[GenerationTaskResponse] = []

    class Config:
        from_attributes = True


# ─── Audio Track Schemas ──────────────────────────────────────────────────────

class AudioTrackUpdate(BaseModel):
    offset_ms: Optional[int] = None
    is_muted: Optional[bool] = None
    label: Optional[str] = None
    asset_url: Optional[str] = None


class AudioTrackResponse(BaseModel):
    id: str
    project_id: str
    track_type: str
    asset_url: Optional[str]
    offset_ms: int
    is_muted: bool
    label: Optional[str]

    class Config:
        from_attributes = True


# ─── Video Generation Schemas ─────────────────────────────────────────────────

class GroupGenerateRequest(BaseModel):
    project_id: str
    slice_ids: List[str]
    prompt_override: Optional[str] = None


# ─── Export Schemas ───────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    project_id: str
    format: str = "mp4"
    include_subtitles: bool = True
    include_bgm: bool = True


class ExportResponse(BaseModel):
    download_url: str
    filename: str
    estimated_size_mb: float


# ─── SSE Schema ───────────────────────────────────────────────────────────────

class SSEEvent(BaseModel):
    event_type: str
    project_id: str
    data: Dict[str, Any]
