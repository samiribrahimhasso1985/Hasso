"""Error types with Arabic messages shown to the user (details go to the log)."""


class VPAError(Exception):
    """Base error. `message_ar` is what the user sees; str(self) goes to the log."""

    def __init__(self, message: str, message_ar: str | None = None):
        super().__init__(message)
        self.message_ar = message_ar or message


class DependencyError(VPAError):
    pass


class MediaError(VPAError):
    pass


class TranscriptionError(VPAError):
    pass


class ProjectError(VPAError):
    pass
