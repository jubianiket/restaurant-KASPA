// static/js/settings.js

document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    const licenseForm = document.getElementById('licenseForm');
    const statusMessage = document.getElementById('statusMessage');
    const saveButton = document.getElementById('saveButton');
    const renewButton = document.getElementById('renewButton');

    // Function to display messages
    const showMessage = (message, status) => {
        statusMessage.textContent = message;
        statusMessage.className = `message ${status}`;
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'message';
        }, 5000); // Clear message after 5 seconds
    };

    // Handle the main settings form submission
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(settingsForm);

            // Show a loading state
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            showMessage('', '');

            try {
                const response = await fetch('/settings', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error.');
                }

                const result = await response.json();

                if (result.status === 'success') {
                    showMessage(result.message, 'success');
                    // 🔄 Update parent dashboard on success
                    if (window.parent && typeof window.parent.fetchSettings === 'function') {
                        window.parent.fetchSettings();
                    }
                } else {
                    showMessage(`Error: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showMessage('An unexpected error occurred.', 'error');
            } finally {
                // Re-enable the button
                saveButton.disabled = false;
                saveButton.textContent = '💾 Save Settings';
            }
        });
    }

    // Handle the license renewal form submission
    if (licenseForm) {
        licenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(licenseForm);

            // Show a loading state
            renewButton.disabled = true;
            renewButton.textContent = 'Renewing...';
            showMessage('', '');

            try {
                const response = await fetch(licenseForm.action, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Server responded with an error.');
                }

                const result = await response.json();
                
                if (result.status === 'success') {
                    showMessage(result.message, 'success');
                } else {
                    showMessage(`Error: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('Error renewing license:', error);
                showMessage('An unexpected error occurred.', 'error');
            } finally {
                renewButton.disabled = false;
                renewButton.textContent = '🔑 Renew License';
            }
        });
    }
});