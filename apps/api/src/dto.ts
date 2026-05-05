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

export class LoginDto {
  @ApiProperty({ example: "jacky105402002" })
  username!: string;

  @ApiProperty({ example: "password" })
  password!: string;
}

export class CreateAccountDto {
  @ApiProperty({ example: "frontend-user" })
  username!: string;

  @ApiProperty({ example: "change-me-please" })
  password!: string;

  @ApiProperty({ example: "user", enum: ["admin", "user"] })
  role?: string;

  @ApiPropertyOptional({ example: "Frontend User" })
  displayName?: string;
}

export class CreateProjectBindingDto {
  @ApiProperty({ example: "my-project" })
  projectId!: string;

  @ApiProperty({ example: "My Project" })
  name!: string;

  @ApiPropertyOptional({ example: "Project dashboard binding" })
  description?: string;
}
