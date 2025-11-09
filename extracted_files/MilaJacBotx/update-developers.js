/**
 * PS99 Developer ID Updater
 * 
 * This script automatically updates the key-developers.cjs file with the
 * latest developer information from the PS99 group.
 */

const fs = require('fs');
const axios = require('axios');
const path = require('path');

// PS99 group ID
const PS99_GROUP_ID = 3959677;

// Get current developers
let currentDevelopers = [];
try {
  currentDevelopers = require('./key-developers.cjs');
  console.log(`Loaded ${currentDevelopers.length} developers from current file`);
} catch (error) {
  console.error('Error loading current developers:', error.message);
  console.log('Starting with empty developer list');
  currentDevelopers = [];
}

// Function to get group members
async function getGroupMembers() {
  try {
    console.log(`Fetching roles for group ${PS99_GROUP_ID}...`);
    
    // First get roles
    const rolesResponse = await axios.get(
      `https://groups.roblox.com/v1/groups/${PS99_GROUP_ID}/roles`
    );
    
    const roles = rolesResponse.data.roles;
    console.log(`Found ${roles.length} roles in the group`);
    
    // Only get members from important roles (admins, devs)
    const importantRoles = roles.filter(role => 
      role.rank >= 200 || 
      role.name.toLowerCase().includes('dev') || 
      role.name.toLowerCase().includes('admin')
    );
    
    console.log(`Found ${importantRoles.length} important roles to scan`);
    
    // Get members for each role
    const developers = [];
    
    for (const role of importantRoles) {
      console.log(`Fetching members for role: ${role.name} (Rank: ${role.rank})`);
      
      const membersResponse = await axios.get(
        `https://groups.roblox.com/v1/groups/${PS99_GROUP_ID}/roles/${role.id}/users`
      );
      
      const members = membersResponse.data.data;
      console.log(`Found ${members.length} members with role ${role.name}`);
      
      for (const member of members) {
        console.log(`Processing member: ${member.username} (${member.userId})`);
        
        // Get additional details
        try {
          const profileResponse = await axios.get(
            `https://users.roblox.com/v1/users/${member.userId}`
          );
          
          developers.push({
            id: member.userId,
            username: member.username,
            displayName: profileResponse.data.displayName || member.username,
            role: role.name,
            priority: role.rank >= 250 ? 1 : (role.rank >= 200 ? 2 : 3),
            description: `${role.name} in PS99 Group`
          });
          
          console.log(`Added ${member.username} with priority ${role.rank >= 250 ? 1 : (role.rank >= 200 ? 2 : 3)}`);
        } catch (profileError) {
          console.error(`Error fetching profile for ${member.username}:`, profileError.message);
          
          // Add with limited info
          developers.push({
            id: member.userId,
            username: member.username,
            displayName: member.username,
            role: role.name,
            priority: role.rank >= 250 ? 1 : (role.rank >= 200 ? 2 : 3),
            description: `${role.name} in PS99 Group`
          });
        }
        
        // Avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return developers;
  } catch (error) {
    console.error('Error fetching developers:', error.message);
    return [];
  }
}

// Add critical developers that might not be in the group
function addCriticalDevelopers(developers) {
  const criticalDevs = [
    { 
      id: 13365322, 
      username: "chickenputty", 
      displayName: "Adam",
      role: "Lead Developer",
      priority: 1,
      description: "PS99 Lead Developer"
    },
    { 
      id: 7707349, 
      username: "JamienChee", 
      displayName: "Jamien",
      role: "Lead Developer",
      priority: 1,
      description: "PS99 Lead Developer"
    },
    {
      id: 1210210,
      username: "ForeverDev",
      displayName: "David",
      role: "Core Developer",
      priority: 1,
      description: "PS99 Core Developer (David)"
    },
    {
      id: 19717956,
      username: "BuildIntoGames",
      displayName: "Preston",
      role: "Founder",
      priority: 1,
      description: "Big Games Founder"
    }
  ];

  for (const criticalDev of criticalDevs) {
    if (!developers.find(dev => dev.id === criticalDev.id)) {
      console.log(`Adding critical developer: ${criticalDev.username}`);
      developers.push(criticalDev);
    }
  }
  
  return developers;
}

// Main function
async function updateDevelopers() {
  console.log('Starting PS99 developer update...');
  console.log('Fetching latest PS99 developers from group...');
  
  const newDevelopers = await getGroupMembers();
  
  if (newDevelopers.length === 0) {
    console.log('Failed to get developers or none found. Using current list with critical developers.');
    return addCriticalDevelopers(currentDevelopers);
  }
  
  console.log(`Found ${newDevelopers.length} developers from the group.`);
  
  // Backup current file if it exists
  if (fs.existsSync('key-developers.cjs')) {
    const backupPath = `key-developers.backup.${Date.now()}.cjs`;
    fs.copyFileSync('key-developers.cjs', backupPath);
    console.log(`Backed up current developers to ${backupPath}`);
  }
  
  // Add critical developers
  const mergedDevelopers = addCriticalDevelopers(newDevelopers);
  
  // Sort by priority then by username
  mergedDevelopers.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.username.localeCompare(b.username);
  });
  
  // Create new file content
  const fileContent = `/**
 * Key PS99 Developers
 * 
 * This file contains the most important developers to track for PS99 asset leaks.
 * These developers are prioritized in our scanning system.
 * Last updated: ${new Date().toLocaleString()}
 */

module.exports = ${JSON.stringify(mergedDevelopers, null, 2)};`;
  
  // Write new file
  fs.writeFileSync('key-developers.cjs', fileContent);
  
  console.log(`Updated key-developers.cjs with ${mergedDevelopers.length} developers`);
  console.log('Developer update complete!');
  
  return mergedDevelopers;
}

// Run the update if called directly
if (require.main === module) {
  updateDevelopers()
    .then(developers => {
      console.log(`Successfully updated developers list with ${developers.length} entries.`);
    })
    .catch(error => {
      console.error('Error in developer update:', error);
      process.exit(1);
    });
}

// Export for use in other scripts
module.exports = { updateDevelopers };