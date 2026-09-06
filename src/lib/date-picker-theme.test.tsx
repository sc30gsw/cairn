import { DateInput, DatePickerInput, DateTimePicker } from "@mantine/dates";
import { fireEvent } from "@testing-library/react";
import { expect, test } from "vite-plus/test";

import { calendarDayStyleClasses } from "~/lib/calendar-day-style";
import { renderWithMantine } from "~/test-utils/render";

test.each([DatePickerInput, DateTimePicker, DateInput])(
  "%s は共通の祝日・週末色を使い、選択状態を保持する",
  async (Picker) => {
    const { getByLabelText, findByLabelText } = renderWithMantine(
      <Picker label="日付" value="2026-09-06" defaultDate="2026-09-06" />,
    );
    if (Picker === DateInput) fireEvent.focus(getByLabelText("日付"));
    else fireEvent.click(getByLabelText("日付"));
    await findByLabelText("5 9月 2026");
    expect([...getByLabelText("5 9月 2026").classList]).toContain(
      calendarDayStyleClasses.saturdayDay,
    );
    expect([...getByLabelText("6 9月 2026").classList]).toContain(
      calendarDayStyleClasses.sundayDay,
    );
    expect(getByLabelText("6 9月 2026").hasAttribute("data-selected")).toBe(true);
    expect([...getByLabelText("23 9月 2026").classList]).toContain(
      calendarDayStyleClasses.holidayDay,
    );
    expect(getByLabelText("23 9月 2026").getAttribute("title")).toBe("秋分の日");
  },
);
