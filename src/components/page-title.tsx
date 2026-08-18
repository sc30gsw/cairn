import { Title, type TitleProps } from "@mantine/core";

//? 履歴/項目/プリセット/目標/ゴミ箱の見出しに共通する波下線(Paper Redesign)。3箇所目の重複で共通化(AHA)
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
