export const INTEGRATION_META: Record<string, { name: string; description: string; color: string }> = {
  slack: {
    name: "Slack",
    description: "Post deal wins and weekly summaries to a Slack channel.",
    color: "#611f69",
  },
  zapier: {
    name: "Zapier",
    description: "Trigger Zaps whenever a deal or customer changes.",
    color: "#FF4A00",
  },
  google_sheets: {
    name: "Google Sheets",
    description: "Keep a live spreadsheet copy of your customers and deals.",
    color: "#0F9D58",
  },
};
