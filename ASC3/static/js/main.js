document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const checkAllBtn = document.getElementById('checkAllBtn');
    const checkAllFilesBtn = document.getElementById('checkAllFilesBtn');
    const dbResults = document.getElementById('dbResults');
    const comparisonResults = document.getElementById('comparisonResults');
    const totalFiles = document.getElementById('totalFiles');
    const totalComparisons = document.getElementById('totalComparisons');
    const result = document.getElementById('result');
    const error = document.getElementById('error');
    const loadingSpinner = document.querySelector('.loading-spinner');
    const fileList = document.getElementById('fileList');
    const menuFileList = document.getElementById('menuFileList');
    const filesMenuButton = document.getElementById('filesMenuButton');
    const filesDropdown = document.getElementById('filesDropdown');

    // Theme handling
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    const themeIcon = themeToggle.querySelector('i');
    const themeText = themeToggle.querySelector('span');

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);

    // Theme toggle click handler
    themeToggle.addEventListener('click', function() {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });

    function updateThemeButton(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            themeText.textContent = 'Dark Mode';
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            themeText.textContent = 'Light Mode';
        }
    }

    // Toggle files dropdown menu
    filesMenuButton.addEventListener('click', function() {
        filesDropdown.classList.toggle('show');
        filesDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!filesMenuButton.contains(e.target) && !filesDropdown.contains(e.target)) {
            filesDropdown.classList.remove('show');
            filesDropdown.classList.add('hidden');
        }
    });

    // Link the "Check All Files" button in the menu to the main button
    checkAllFilesBtn.addEventListener('click', function() {
        filesDropdown.classList.remove('show');
        filesDropdown.classList.add('hidden');
        checkAllBtn.click();
        
        // Scroll to results section
        setTimeout(() => {
            document.querySelector('.mt-12:nth-of-type(3)').scrollIntoView({ behavior: 'smooth' });
        }, 300);
    });

    // Animation on page load
    animateElementsOnLoad();
    
    // Load files on page load
    loadFiles();

    // Handle file upload
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        showLoading();
        hideError();
        hideResult();

        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Uploading...';
        
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('File uploaded successfully');
                loadFiles(); // Reload the file list
            } else {
                showError(data.error);
            }
        } catch (err) {
            showError('An error occurred while uploading the file.');
        } finally {
            hideLoading();
            
            // Re-enable button and restore original text
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload mr-2"></i> Upload PDF';
        }
    });

    // Load files from database
    async function loadFiles() {
        try {
            const response = await fetch('/files');
            const data = await response.json();
            
            if (response.ok) {
                updateFileList(data);
                updateMenuFileList(data);
                
                // Update the files count in the menu button
                if (data.length > 0) {
                    filesMenuButton.innerHTML = `
                        <i class="fas fa-file-pdf mr-2"></i>
                        Uploaded Files (${data.length})
                        <i class="fas fa-chevron-down ml-2 text-xs"></i>
                    `;
                }
            } else {
                showError(data.error);
            }
        } catch (err) {
            showError('An error occurred while loading files.');
        }
    }

    // Update file list display
    function updateFileList(files) {
        if (files.length === 0) {
            fileList.innerHTML = `
                <div class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                    <i class="fas fa-cloud-upload-alt text-3xl mb-2 text-gray-400"></i>
                    <p>No files uploaded yet</p>
                </div>
            `;
            return;
        }
        
        fileList.innerHTML = '';
        files.forEach((file, index) => {
            const fileElement = document.createElement('div');
            fileElement.className = 'bg-white border rounded-lg p-4 shadow-sm file-preview hover:shadow-md transition-all duration-200';
            fileElement.style.animationDelay = `${index * 0.1}s`;
            fileElement.setAttribute('data-file-id', file.id);
            fileElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="mr-3">
                            <input type="checkbox" id="file-${file.id}" class="file-checkbox w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500">
                        </div>
                        <i class="fas fa-file-pdf text-indigo-500 mr-3 text-xl"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-700">${file.filename}</p>
                            <p class="text-xs text-gray-500">Uploaded: ${new Date(file.upload_date).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="flex items-center">
                        <div class="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded mr-3">ID: ${file.id}</div>
                        <button class="delete-file-btn p-1.5 bg-red-50 hover:bg-red-100 rounded-full text-red-500 transition-colors" 
                                data-file-id="${file.id}" data-filename="${file.filename}">
                            <i class="fas fa-trash-alt text-sm"></i>
                        </button>
                    </div>
                </div>
            `;
            fileList.appendChild(fileElement);
            
            // Add animation
            setTimeout(() => {
                fileElement.classList.add('fade-in');
            }, 50);
            
            // Add delete event listener
            const deleteBtn = fileElement.querySelector('.delete-file-btn');
            deleteBtn.addEventListener('click', handleFileDelete);
        });

        // Add compare selected button if there are files
        if (files.length > 0) {
            const compareSelectedBtn = document.createElement('div');
            compareSelectedBtn.className = 'mt-4';
            compareSelectedBtn.innerHTML = `
                <button id="compareSelectedBtn" class="inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                    <i class="fas fa-check-square mr-2"></i>
                    Compare Selected Files
                </button>
            `;
            fileList.appendChild(compareSelectedBtn);

            // Add event listener for compare selected button
            document.getElementById('compareSelectedBtn').addEventListener('click', compareSelectedFiles);
        }
    }
    
    // Update menu file list
    function updateMenuFileList(files) {
        if (files.length === 0) {
            menuFileList.innerHTML = `
                <div class="text-center text-gray-500 py-4 text-sm">
                    <i class="fas fa-info-circle mr-1"></i>
                    No files uploaded yet
                </div>
            `;
            return;
        }
        
        menuFileList.innerHTML = '';
        
        // Sort files by upload date, most recent first
        const sortedFiles = [...files].sort((a, b) => {
            return new Date(b.upload_date) - new Date(a.upload_date);
        });
        
        sortedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'menu-file-item';
            fileItem.setAttribute('data-file-id', file.id);
            fileItem.innerHTML = `
                <i class="fas fa-file-pdf file-icon"></i>
                <div class="overflow-hidden flex-grow">
                    <p class="text-sm font-medium text-gray-700 truncate" title="${file.filename}">${file.filename}</p>
                    <p class="text-xs text-gray-500">ID: ${file.id}</p>
                </div>
                <button class="delete-menu-file-btn ml-2 text-gray-400 hover:text-red-500 transition-colors" 
                        data-file-id="${file.id}" data-filename="${file.filename}">
                    <i class="fas fa-trash-alt text-sm"></i>
                </button>
            `;
            
            menuFileList.appendChild(fileItem);
            
            // Add click event to view file
            fileItem.addEventListener('click', function(e) {
                // Don't trigger if click was on delete button
                if (e.target.closest('.delete-menu-file-btn')) return;
                
                filesDropdown.classList.remove('show');
                filesDropdown.classList.add('hidden');
                
                // Scroll to file in main list
                setTimeout(() => {
                    const mainFileElement = fileList.querySelector(`[data-file-id="${file.id}"]`) || 
                                          document.querySelector('.mt-12:nth-of-type(2)');
                    if (mainFileElement) {
                        mainFileElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 300);
            });
            
            // Add delete event listener
            const deleteBtn = fileItem.querySelector('.delete-menu-file-btn');
            deleteBtn.addEventListener('click', handleFileDelete);
        });
    }

    // Handle checking all files
    checkAllBtn.addEventListener('click', async function() {
        showLoading();
        hideError();
        hideResult();
        hideDbResults();

        // Add button loading state
        const originalButtonText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Checking...';

        try {
            const response = await fetch('/check-all');
            const data = await response.json();
            
            if (response.ok) {
                showDbResults(data);
            } else {
                showError(data.message || data.error);
            }
        } catch (err) {
            showError('An error occurred while checking all files.');
        } finally {
            hideLoading();
            
            // Reset button
            this.disabled = false;
            this.innerHTML = originalButtonText;
        }
    });

    // Helper functions
    function showLoading() {
        loadingSpinner.style.display = 'block';
    }

    function hideLoading() {
        loadingSpinner.style.display = 'none';
    }

    function showError(message) {
        error.querySelector('p').textContent = message;
        error.classList.remove('hidden');
        
        // Scroll to error message
        setTimeout(() => {
            error.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    function hideError() {
        error.classList.add('hidden');
    }

    function showSuccess(message) {
        const success = document.createElement('div');
        success.className = 'bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg relative mb-6 fade-in';
        success.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-check-circle text-green-500"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
            </div>
        `;
        uploadForm.insertAdjacentElement('beforebegin', success);
        
        // Remove after delay with fade-out animation
        setTimeout(() => {
            success.style.opacity = '0';
            success.style.transform = 'translateY(-10px)';
            success.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            setTimeout(() => success.remove(), 500);
        }, 3000);
    }

    function showResult(data) {
        result.querySelector('h3').textContent = 'Comparison Results';
        result.querySelector('.similarity-score').textContent = data.message;
        
        const progressBar = result.querySelector('.progress-bar-fill');
        const percentage = data.similarity * 100;
        
        // Animate progress bar
        progressBar.style.width = '0%';
        result.classList.remove('hidden');
        
        setTimeout(() => {
            progressBar.style.width = `${percentage}%`;
        }, 100);
    }

    function hideResult() {
        result.classList.add('hidden');
    }

    function showDbResults(data) {
        if (data.error) {
            showError(data.message || data.error);
            return;
        }
        
        totalFiles.textContent = data.total_files || data.message.split(' ')[0];
        totalComparisons.textContent = data.total_comparisons || data.results.length;
        
        comparisonResults.innerHTML = '';
        data.results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = 'bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200';
            resultElement.style.opacity = '0';
            resultElement.style.transform = 'translateY(10px)';
            
            if (result.error) {
                resultElement.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-700">${result.file1_name} vs ${result.file2_name}</p>
                            <p class="text-sm text-red-600 mt-1">${result.error}</p>
                        </div>
                    </div>
                `;
            } else {
                // Calculate color based on similarity
                const percentage = result.similarity * 100;
                let colorClass = 'bg-green-500';
                if (percentage > 80) {
                    colorClass = 'bg-red-500';
                } else if (percentage > 50) {
                    colorClass = 'bg-yellow-500';
                }
                
                resultElement.innerHTML = `
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <p class="text-sm font-medium text-gray-700">${result.file1_name} vs ${result.file2_name}</p>
                        </div>
                        <div class="text-sm font-bold ${percentage > 80 ? 'text-red-600' : percentage > 50 ? 'text-yellow-600' : 'text-green-600'}">
                            ${result.similarity_percentage}
                        </div>
                    </div>
                    <div class="w-full mt-2">
                        <div class="bg-gray-200 rounded-full h-2">
                            <div class="${colorClass} rounded-full h-2 transition-all duration-700" style="width: 0%"></div>
                        </div>
                    </div>
                `;
            }
            
            comparisonResults.appendChild(resultElement);
            
            // Animate each result with a delay
            setTimeout(() => {
                resultElement.style.opacity = '1';
                resultElement.style.transform = 'translateY(0)';
                resultElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                
                // Animate progress bar if it exists
                const progressBar = resultElement.querySelector('.rounded-full.h-2:not(.bg-gray-200)');
                if (progressBar) {
                    setTimeout(() => {
                        progressBar.style.width = `${result.similarity * 100}%`;
                    }, 300);
                }
            }, 100 + (index * 100));
        });
        
        dbResults.classList.remove('hidden');
    }

    function hideDbResults() {
        dbResults.classList.add('hidden');
    }

    // Animate elements on load
    function animateElementsOnLoad() {
        document.querySelectorAll('.fade-in').forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';
            
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            }, 100 + (index * 100));
        });
    }

    // Handle drag and drop
    const dropZones = document.querySelectorAll('.drag-drop-zone');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
            const input = this.querySelector('input[type="file"]');
            const files = e.dataTransfer.files;
            
            if (files.length > 0) {
                input.files = files;
                updateFilePreview(this, files[0]);
            }
        });
    });
    
    // Handle file input change
    document.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener('change', function() {
            if (this.files.length > 0) {
                updateFilePreview(this.closest('.drag-drop-zone'), this.files[0]);
            }
        });
    });
    
    function updateFilePreview(zone, file) {
        const preview = zone.querySelector('.file-preview');
        const fileName = zone.querySelector('.file-name');
        
        if (file.type === 'application/pdf') {
            preview.style.display = 'flex';
            fileName.textContent = file.name;
            
            // Add animation
            preview.classList.add('fade-in');
        } else {
            preview.style.display = 'none';
            fileName.textContent = '';
        }
    }

    // Handle file deletion
    async function handleFileDelete(e) {
        e.stopPropagation();
        const fileId = this.getAttribute('data-file-id');
        const fileName = this.getAttribute('data-filename');
        
        if (!confirm(`Are you sure you want to delete ${fileName}?`)) {
            return;
        }
        
        showLoading();
        
        try {
            const response = await fetch(`/delete-file/${fileId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess(data.message || 'File deleted successfully');
                loadFiles(); // Reload the file lists
            } else {
                showError(data.error || 'Failed to delete file');
            }
        } catch (err) {
            showError('An error occurred while deleting the file');
        } finally {
            hideLoading();
        }
    }

    // Function to compare selected files
    async function compareSelectedFiles() {
        const selectedFiles = Array.from(document.querySelectorAll('.file-checkbox:checked')).map(
            checkbox => parseInt(checkbox.id.replace('file-', ''))
        );

        if (selectedFiles.length < 2) {
            showError('Please select at least 2 files to compare');
            return;
        }

        showLoading();
        hideError();
        hideResult();
        hideDbResults();

        try {
            const response = await fetch('/compare-selected', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_ids: selectedFiles })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showDbResults(data);
            } else {
                showError(data.message || data.error);
            }
        } catch (err) {
            showError('An error occurred while comparing selected files.');
        } finally {
            hideLoading();
        }
    }

    function createFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200';
        fileItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-file-pdf text-indigo-500 text-xl"></i>
                <div>
                    <div class="font-medium text-gray-900">${file.name}</div>
                    <div class="text-sm text-gray-500">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="check-file-btn inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <i class="fas fa-search mr-1"></i>
                    Check File
                </button>
                <button class="delete-file-btn inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    <i class="fas fa-trash-alt mr-1"></i>
                    Delete
                </button>
            </div>
        `;

        // Add event listeners
        const checkBtn = fileItem.querySelector('.check-file-btn');
        const deleteBtn = fileItem.querySelector('.delete-file-btn');

        checkBtn.addEventListener('click', () => checkFile(file.id));
        deleteBtn.addEventListener('click', () => deleteFile(file.id));

        return fileItem;
    }

    async function checkFile(fileId) {
        try {
            showLoading();
            const response = await fetch(`/check_file/${fileId}`);
            const data = await response.json();
            
            if (data.error) {
                showError(data.error);
                return;
            }

            // Display results
            const resultDiv = document.getElementById('result');
            const similarityScore = resultDiv.querySelector('.similarity-score');
            const progressBarFill = resultDiv.querySelector('.progress-bar-fill');
            
            resultDiv.classList.remove('hidden');
            similarityScore.textContent = `Similarity: ${data.similarity}%`;
            progressBarFill.style.width = `${data.similarity}%`;
            
            // Show detailed results
            const resultsContainer = document.getElementById('comparisonResults');
            resultsContainer.innerHTML = '';
            
            data.comparisons.forEach(comp => {
                const compItem = document.createElement('div');
                compItem.className = 'bg-white rounded-lg shadow-sm p-4 border border-gray-200';
                compItem.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <div class="font-medium text-gray-900">${comp.file_name}</div>
                        <div class="text-sm text-indigo-600">${comp.similarity}%</div>
                    </div>
                    <div class="text-sm text-gray-500">${comp.details}</div>
                `;
                resultsContainer.appendChild(compItem);
            });

            // Show results section
            document.getElementById('dbResults').classList.remove('hidden');
            
        } catch (error) {
            showError('Error checking file: ' + error.message);
        } finally {
            hideLoading();
        }
    }
}); 