import { Title, type TitleProps } from "@mantine/core";

export function PageTitle({ children, ...props }: TitleProps) {
  return (
    <Title
      order={1}
      style={{
        textDecoration: "underline wavy var(--mantine-color-orange-4)",
        textDecorationThickness: 2,
        textUnderlineOffset: 10,
      }}
      {...props}
    >
      {children}
    </Title>
  );
}
