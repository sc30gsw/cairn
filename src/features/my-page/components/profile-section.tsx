import { Avatar, Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { Result } from "better-result";
import { useRef, useState } from "react";

import { AvatarCropModal } from "~/features/my-page/components/avatar-crop-modal";
import { useAvatarUploadDeps } from "~/features/my-page/hooks/use-avatar-upload-deps";
import { avatarUploadErrorMessage, uploadAvatarBlob } from "~/features/my-page/lib/avatar-upload";
import { useAppShellUser } from "~/hooks/use-auth-session";
import { useAvatarDisplayUrl } from "~/hooks/use-avatar-display-url";
import { updateProfileImage } from "~/lib/profile-actions";
import { userLabel } from "~/lib/user-label";

export function ProfileSection() {
  const user = useAppShellUser();
  const avatarSrc = useAvatarDisplayUrl(user?.image);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadDeps = useAvatarUploadDeps();
  const [previewSrc, setPreviewSrc] = useState<null | string>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<null | string>(null);

  if (user === null) {
    return null;
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewSrc(reader.result);
        setCropOpen(true);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleConfirm(blob: Blob): Promise<{ errorMessage: null | string }> {
    setUploadSuccessMessage(null);
    const uploadResult = await uploadAvatarBlob(blob, uploadDeps);
    if (Result.isError(uploadResult)) {
      return { errorMessage: avatarUploadErrorMessage(uploadResult.error) };
    }
    const profileResult = await updateProfileImage(uploadResult.value);
    if (profileResult.errorMessage === null) {
      setUploadSuccessMessage("アイコンを更新しました");
    }
    return profileResult;
  }

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>プロフィール</Title>
        <Group gap="md" wrap="nowrap">
          <Avatar alt={userLabel(user)} radius="xl" size={256} src={avatarSrc}>
            {userLabel(user).slice(0, 1)}
          </Avatar>
          <Stack gap="xs">
            <Text fw={600}>{user.name}</Text>
            {user.username ? <Text c="dimmed">@{user.username}</Text> : null}
            <Button
              leftSection={<IconCamera aria-hidden size={16} />}
              onClick={openFilePicker}
              size="xs"
              type="button"
              variant="light"
            >
              アイコンを変更
            </Button>
            {uploadSuccessMessage ? (
              <Text c="green" size="xs">
                {uploadSuccessMessage}
              </Text>
            ) : null}
            <Text c="dimmed" size="xs">
              JPEG / PNG（保存時 256×256px に切り抜き）
            </Text>
          </Stack>
        </Group>
        <input
          accept="image/jpeg,image/png"
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        {previewSrc ? (
          <AvatarCropModal
            imageSrc={previewSrc}
            onClose={() => setCropOpen(false)}
            onConfirm={handleConfirm}
            opened={cropOpen}
          />
        ) : null}
      </Stack>
    </Card>
  );
}
