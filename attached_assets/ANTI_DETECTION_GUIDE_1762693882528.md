# Anti-Detection Guide for PS99 Slime Tycoon Automation

This guide explains how the anti-detection features work in the PS99 Slime Tycoon Ultimate Automation and how to configure them for maximum safety.

## How Anti-Detection Works

The automation uses several sophisticated techniques to remain undetectable:

### 1. Humanized Input Patterns

- **Varied Input Timing**: Input actions are performed with natural timing variations that mimic human behavior
- **Path Randomization**: Movement paths include small natural deviations
- **Momentum Simulation**: Mouse movements follow natural acceleration and deceleration curves
- **Varied Click Pressure**: Mouse clicks simulate varied pressure and duration

### 2. Stealth Mode

- **Random Pauses**: The automation takes occasional breaks to simulate natural human behavior
- **Active Observation**: During breaks, small camera movements are performed to simulate a player looking around
- **Inconsistent Timing**: Activities are performed with slight inconsistencies in timing

### 3. Activity Rotation

- **Task Switching**: The automation rotates between different activities rather than repeating the same action
- **Priority Shifting**: Periodically changes focus between chests, factory, and breakable area
- **Organic Movement**: Character movement follows natural paths between locations

### 4. Server-Side Considerations

- **Request Rate Limiting**: All virtual interactions with the server are rate-limited to avoid detection
- **Input Validation**: All input patterns pass the same validation checks as legitimate players
- **Timing Compliance**: Activities respect the game's internal cooldowns

## Configuring Anti-Detection Settings

### Basic Settings (Settings Tab)

- **Anti-Detection**: Master toggle for all anti-detection features
- **Auto Movement**: Controls whether the character moves automatically between locations

### Advanced Settings (Advanced Tab)

- **Humanized Input Patterns**: Enable/disable natural input simulation
- **Stealth Mode**: Enable/disable random pauses and breaks
- **Stealth Level (1-5)**: Adjust the intensity of anti-detection measures:
  - **Level 1**: Minimal measures, faster automation
  - **Level 3**: Balanced approach (recommended)
  - **Level 5**: Maximum safety, slower automation

### Recommended Configurations

#### Low-Risk Environments (Private Servers)

- Stealth Level: 1-2
- Humanized Input: Enabled
- Stealth Mode: Optional

#### Standard Usage

- Stealth Level: 3
- Humanized Input: Enabled
- Stealth Mode: Enabled

#### High-Risk Environments

- Stealth Level: 4-5
- Humanized Input: Enabled
- Stealth Mode: Enabled
- Reduce automation duration to 30-60 minutes at a time

## Best Practices

1. **Avoid AFK Detection**: Occasionally perform manual actions to reset AFK timers
2. **Session Length**: Keep automation sessions under 2 hours
3. **Varied Times**: Run the automation at different times of day
4. **Natural Progression**: Allow normal game progression rather than extreme optimization
5. **Settings Variation**: Occasionally change anti-detection settings

## Safety Indicators

The automation provides feedback about its detection risk:

- **Green Status**: Safe operation
- **Yellow Status**: Approaching detection threshold
- **Red Status**: High risk of detection (automation will pause)

By following these guidelines and properly configuring the anti-detection settings, your automation should remain completely undetectable during normal usage.
