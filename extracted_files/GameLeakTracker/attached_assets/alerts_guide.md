# PS99 Customizable Asset Tracking Alerts Guide

## Overview

The Customizable Asset Tracking Alerts system allows you to set up notifications for specific types of Roblox assets related to Pet Simulator 99. With this feature, you can be automatically notified when new content is discovered that matches your criteria.

## Alert Types

You can configure alerts based on several criteria:

1. **Asset Type**
   - Models (3D Models)
   - Meshes (MeshParts)
   - Decals (Images)
   - Audio

2. **Creator**
   - Specific Roblox users
   - Specific Roblox groups (like Big Games)

3. **Keywords**
   - Words in the asset name or description
   - Examples: "pet", "coins", "mythical", "legendary", etc.

## Predefined Alert Templates

For convenience, we provide several predefined alert templates:

1. **New Models Alert** - Notify when any new models are uploaded
2. **New Meshes Alert** - Notify when any new meshes are uploaded
3. **PS99 Keyword Alert** - Notify when assets with PS99-related keywords are uploaded
4. **Big Games Alert** - Notify when Big Games (PS99 developer) uploads new assets
5. **New Pets Alert** - Notify when assets that might be new pets are uploaded
6. **New Areas Alert** - Notify when assets that might be new areas are uploaded

## Creating a Custom Alert

To create a custom alert:

1. Click "Manage Alerts" from the main page
2. Click "Create New Alert"
3. Fill in the alert details:
   - Name: A descriptive name for the alert
   - Description: What this alert is for
   - Asset Types: Select which types of assets to track
   - Keywords: Add words to search for in asset names and descriptions
   - Creator: Optionally specify a particular user or group
   - Enabled: Check this to activate the alert

## Alert Notifications

When an alert is triggered:

1. A notification will appear at the top of the page
2. You can view details about the matching assets
3. The alert history will show all previously triggered alerts

## Best Practices

For effective asset tracking:

1. **Be specific** - Use targeted keywords to avoid false positives
2. **Combine criteria** - Use asset types AND keywords for more precise alerts
3. **Start broad, then refine** - Begin with general alerts, then create more specific ones
4. **Check alert history** - Review past alerts to see patterns
5. **Target active developers** - Focus on the Big Games team members who are known to work on PS99

## Testing Alerts

You can test your alerts by:

1. Running a scan on the Big Games group
2. Using the "Test Alert Notification" button
3. Scanning specific users who are known to create PS99 content

## Alert History

The Alert History section shows all previously triggered alerts, including:

1. When the alert was triggered
2. Which assets matched the alert
3. Details about the matching assets

This history helps you track patterns over time and refine your alerts.

## Technical Details

Alerts are stored as JSON files in the `ps99_tracker_data/alerts` directory. Each alert includes:

```json
{
  "id": "alert_1712345678",
  "name": "Example Alert",
  "description": "Alert me when new pets are uploaded",
  "enabled": true,
  "assetTypes": [10, 40],
  "creators": [{"id": 5060810, "type": "Group"}],
  "keywords": ["pet", "huge", "titanic"],
  "created": "2025-04-10T12:00:00.000Z",
  "updated": "2025-04-10T12:00:00.000Z"
}
```

Alert processing happens automatically during scans, matching assets against all enabled alerts.

## Need Help?

If you have questions about setting up alerts, contact us through our Discord server or the support page.