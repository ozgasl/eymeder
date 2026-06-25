// Utility functions for calendar integration

export function generateICSFile(event: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
}) {
  const startDate = event.time
    ? new Date(`${event.date}T${event.time}:00`)
    : new Date(`${event.date}T00:00:00`);

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Eyüboğlu Mezunlar Derneği//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${Date.now()}@eymeder.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location || ""}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

export function downloadICS(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
}) {
  const startDate = event.time
    ? new Date(`${event.date}T${event.time}:00`)
    : new Date(`${event.date}T00:00:00`);

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: event.description || "",
    location: event.location || "",
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookUrl(event: {
  title: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
}) {
  const startDate = event.time
    ? new Date(`${event.date}T${event.time}:00`)
    : new Date(`${event.date}T00:00:00`);

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.description || "",
    location: event.location || "",
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}