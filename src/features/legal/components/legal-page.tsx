import { Anchor, Card, Container, List, Stack, Text, Title } from "@mantine/core";

import { PageTitle } from "~/components/page-title";
import type { LegalDocument } from "~/features/legal/content/legal-document";
import { NUMERAL_FONT } from "~/lib/theme";

//? ログイン不要で読める1枚紙。Google の OAuth 同意画面のブランディングからもリンクされる
export function LegalPage({ document }: Record<"document", LegalDocument>) {
  return (
    <Container py="xl" size="sm">
      <Stack gap="lg">
        <Anchor href="/" size="sm">
          ← 学習ログへ戻る
        </Anchor>
        <PageTitle>{document.title}</PageTitle>
        <Text c="dimmed" size="sm">
          最終改定:{" "}
          <Text ff={NUMERAL_FONT} span>
            {document.revisedOn}
          </Text>
        </Text>
        <Text>{document.lead}</Text>
        {document.sections.map((section) => (
          <Card key={section.heading} padding="md">
            <Stack gap="sm">
              <Title order={2} size="h4">
                {section.heading}
              </Title>
              {section.paragraphs.map((paragraph) => (
                <Text key={paragraph} size="sm">
                  {paragraph}
                </Text>
              ))}
              {section.items === undefined ? null : (
                <List size="sm" spacing="xs">
                  {section.items.map((item) => (
                    <List.Item key={item}>{item}</List.Item>
                  ))}
                </List>
              )}
              {section.links === undefined ? null : (
                <List size="sm" spacing="xs">
                  {section.links.map((link) => (
                    <List.Item key={link.href}>
                      <Anchor href={link.href} rel="noopener noreferrer" size="sm" target="_blank">
                        {link.label}
                      </Anchor>
                    </List.Item>
                  ))}
                </List>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
