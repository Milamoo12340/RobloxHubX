// JavaScript for Alert Management

document.addEventListener('DOMContentLoaded', function() {
    // Handle creator type dropdown
    const creatorTypeSelect = document.getElementById('creator-type');
    const creatorIdContainer = document.getElementById('creator-id-container');
    
    creatorTypeSelect.addEventListener('change', function() {
        if (this.value === '') {
            creatorIdContainer.style.display = 'none';
        } else {
            creatorIdContainer.style.display = 'block';
        }
    });
});

// Function to edit an existing alert
function editAlert(alertId) {
    // Fetch the alert data
    fetch(`/api/alerts/${alertId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const alert = data.alert;
                
                // Fill the form with alert data
                document.getElementById('alert-id').value = alertId;
                document.getElementById('alert-name').value = alert.name || '';
                document.getElementById('alert-description').value = alert.description || '';
                document.getElementById('alert-enabled').checked = alert.enabled || false;
                
                // Set asset types
                const assetTypes = alert.assetTypes || [];
                document.getElementById('assetType-model').checked = assetTypes.includes(10);
                document.getElementById('assetType-mesh').checked = assetTypes.includes(40);
                document.getElementById('assetType-decal').checked = assetTypes.includes(13);
                document.getElementById('assetType-audio').checked = assetTypes.includes(3);
                
                // Set keywords
                const keywords = alert.keywords || [];
                document.getElementById('alert-keywords').value = keywords.join(', ');
                
                // Set creator info
                const creators = alert.creators || [];
                if (creators.length > 0) {
                    const creator = creators[0];
                    document.getElementById('creator-type').value = creator.type || '';
                    document.getElementById('creator-id').value = creator.id || '';
                    
                    if (creator.type) {
                        document.getElementById('creator-id-container').style.display = 'block';
                    }
                } else {
                    document.getElementById('creator-type').value = '';
                    document.getElementById('creator-id').value = '';
                    document.getElementById('creator-id-container').style.display = 'none';
                }
                
                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('createAlertModal'));
                modal.show();
            } else {
                alert('Error loading alert: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error fetching alert:', error);
            alert('Error loading alert. Please try again.');
        });
}

// Function to save an alert
function saveAlert() {
    // Get the form data
    const alertId = document.getElementById('alert-id').value;
    const name = document.getElementById('alert-name').value;
    const description = document.getElementById('alert-description').value;
    const enabled = document.getElementById('alert-enabled').checked;
    
    // Get selected asset types
    const assetTypes = [];
    if (document.getElementById('assetType-model').checked) assetTypes.push(10);
    if (document.getElementById('assetType-mesh').checked) assetTypes.push(40);
    if (document.getElementById('assetType-decal').checked) assetTypes.push(13);
    if (document.getElementById('assetType-audio').checked) assetTypes.push(3);
    
    // Get keywords
    const keywordsText = document.getElementById('alert-keywords').value;
    const keywords = keywordsText ? keywordsText.split(',').map(k => k.trim()).filter(k => k) : [];
    
    // Get creator info
    const creatorType = document.getElementById('creator-type').value;
    const creatorId = document.getElementById('creator-id').value;
    
    // Build the alert data
    const alertData = {
        name,
        description,
        enabled,
        assetTypes,
        keywords
    };
    
    // Add creator if specified
    if (creatorType && creatorId) {
        alertData.creators = [
            {
                type: creatorType,
                id: parseInt(creatorId)
            }
        ];
    } else {
        alertData.creators = [];
    }
    
    // If we have an ID, this is an edit
    if (alertId) {
        alertData.id = alertId;
    }
    
    // Save the alert
    fetch('/api/alerts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload the page to show the updated alert list
            window.location.reload();
        } else {
            alert('Error saving alert: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error saving alert:', error);
        alert('Error saving alert. Please try again.');
    });
}

// Function to toggle an alert (enable/disable)
function toggleAlert(alertId, enabled) {
    fetch(`/api/alerts/${alertId}/toggle`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload the page to show the updated status
            window.location.reload();
        } else {
            alert('Error toggling alert: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error toggling alert:', error);
        alert('Error toggling alert. Please try again.');
    });
}

// Function to delete an alert
function deleteAlert(alertId) {
    if (!confirm('Are you sure you want to delete this alert?')) {
        return;
    }
    
    fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reload the page to show the updated alert list
            window.location.reload();
        } else {
            alert('Error deleting alert: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error deleting alert:', error);
        alert('Error deleting alert. Please try again.');
    });
}

// Function to load an alert template
function loadTemplate(templateName) {
    fetch(`/api/alert-templates/${templateName}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const template = data.template;
                
                // Fill the form with template data
                document.getElementById('alert-id').value = '';
                document.getElementById('alert-name').value = template.name || '';
                document.getElementById('alert-description').value = template.description || '';
                document.getElementById('alert-enabled').checked = template.enabled || true;
                
                // Set asset types
                const assetTypes = template.assetTypes || [];
                document.getElementById('assetType-model').checked = assetTypes.includes(10);
                document.getElementById('assetType-mesh').checked = assetTypes.includes(40);
                document.getElementById('assetType-decal').checked = assetTypes.includes(13);
                document.getElementById('assetType-audio').checked = assetTypes.includes(3);
                
                // Set keywords
                const keywords = template.keywords || [];
                document.getElementById('alert-keywords').value = keywords.join(', ');
                
                // Set creator info
                const creators = template.creators || [];
                if (creators.length > 0) {
                    const creator = creators[0];
                    document.getElementById('creator-type').value = creator.type || '';
                    document.getElementById('creator-id').value = creator.id || '';
                    
                    if (creator.type) {
                        document.getElementById('creator-id-container').style.display = 'block';
                    }
                } else {
                    document.getElementById('creator-type').value = '';
                    document.getElementById('creator-id').value = '';
                    document.getElementById('creator-id-container').style.display = 'none';
                }
            } else {
                alert('Error loading template: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error loading template:', error);
            alert('Error loading template. Please try again.');
        });
}