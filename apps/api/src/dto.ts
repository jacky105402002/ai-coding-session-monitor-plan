import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDeviceDto {
  @ApiProperty({ example: "Jacky" })
  displayName?: string;

  @ApiProperty({ example: "Win11 Desktop" })
  deviceName?: string;

  @ApiPropertyOptional({ example: "windows" })
  platform?: string;
}

export class HeartbeatDto {
  @ApiProperty({ example: "dev_xxx" })
  deviceId!: string;
}

export class WorkspaceDto {
  @ApiProperty({ example: "project", enum: ["project", "general"] })
  type?: string;

  @ApiProperty({ example: "my-project" })
  name?: string;

  @ApiPropertyOptional({ example: "hash_only" })
  pathHash?: string;
}

export class CreateSessionDto {
  @ApiProperty({ type: WorkspaceDto })
  workspace?: WorkspaceDto;

  @ApiProperty({ example: "codex", enum: ["codex", "claude", "aider", "gemini", "custom"] })
  tool?: string;

  @ApiProperty({ example: "Initial Codex Session" })
  title?: string;
}

export class UpdateSessionStatusDto {
  @ApiProperty({
    example: "ai_loading",
    enum: ["idle", "ai_loading", "waiting_user", "done", "error", "offline"]
  })
  status!: string;

  @ApiPropertyOptional({ example: "Please implement the dashboard" })
  lastInputPreview?: string | null;

  @ApiPropertyOptional({ example: "Dashboard completed" })
  lastOutputPreview?: string | null;
}

export class CreateMessageDto {
  @ApiProperty({ example: "assistant", enum: ["user", "assistant", "system", "status"] })
  role!: string;

  @ApiProperty({ example: "Dashboard implementation completed." })
  content!: string;
}
