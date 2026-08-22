import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { Result } from "better-result";
import { useRef, useState, useTransition } from "react";
import Cropper, { type Area } from "react-easy-crop";

const OUTPUT_SIZE = 256;

async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<Result<Blob, string>> {
  return Result.tryPromise({
    catch: () => "画像の保存に失敗しました",
    try: async () => {
      const image = await loadImage(imageSrc);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (context === null) {
        throw new Error("キャンバスを初期化できませんでした");
      }
      context.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob === null) {
              reject(new Error("画像の変換に失敗しました"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.92,
        );
      });
    },
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("画像を読み込めませんでした")));
    image.src = src;
  });
}

type AvatarCropModalProps = {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<{ errorMessage: null | string }>;
  opened: boolean;
};

export function AvatarCropModal({ imageSrc, onClose, onConfirm, opened }: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaRef = useRef<Area | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  function onCropComplete(_area: Area, pixels: Area) {
    croppedAreaRef.current = pixels;
  }

  function handleConfirm() {
    if (croppedAreaRef.current === null) {
      return;
    }
    setErrorMessage(null);
    startConfirmTransition(() => {
      void (async () => {
        const cropResult = await cropImageToBlob(imageSrc, croppedAreaRef.current!);
        if (Result.isError(cropResult)) {
          setErrorMessage(cropResult.error);
          return;
        }
        const confirmResult = await onConfirm(cropResult.value);
        if (confirmResult.errorMessage !== null) {
          setErrorMessage(confirmResult.errorMessage);
          return;
        }
        onClose();
      })();
    });
  }

  return (
    <Modal onClose={onClose} opened={opened} size="md" title="アイコンを切り抜く">
      <Stack gap="md">
        <div className="bg-gray-1 relative mx-auto h-64 w-full overflow-hidden rounded-md">
          <Cropper
            aspect={1}
            crop={crop}
            cropShape="round"
            image={imageSrc}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            zoom={zoom}
          />
        </div>
        {errorMessage ? (
          <Text c="red" size="sm">
            {errorMessage}
          </Text>
        ) : null}
        <Group justify="flex-end">
          <Button onClick={onClose} type="button" variant="default">
            キャンセル
          </Button>
          <Button loading={isConfirmPending} onClick={handleConfirm} type="button">
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
