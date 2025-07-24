// Supabase Configuration
        const supabaseUrl = 'https://xhmoiquraxurtdbyosqs.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobW9pcXVyYXh1cnRkYnlvc3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODMxMDcsImV4cCI6MjA2NTU1OTEwN30.dpT_ugdNysl-9aQ7YdegdXlEMvazVPFHOr5aBNljzpY';
        const SUPABASE_URL = supabaseUrl;
        const SUPABASE_ANON_KEY = supabaseKey;

        // Initialize Supabase client
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Application State
        let studentData = {
            id: null,
            email: null,
            name: null,
            profileComplete: false,
            documents: {},
            profileImage: null
        };

        const requiredDocuments = [
            { id: 'school_fee', name: 'School Fee Receipt', required: true, icon: 'fas fa-receipt' },
            { id: 'hostel', name: 'Hostel Clearance Receipt', required: false, icon: 'fas fa-bed' },
            { id: 'departmental', name: 'Departmental Receipt', required: true, icon: 'fas fa-building' },
            { id: 'medical', name: 'Medical Receipt', required: true, icon: 'fas fa-heartbeat' },
            { id: 'courses', name: 'School Courses Receipt', required: true, icon: 'fas fa-book' },
            { id: 'it', name: 'IT Receipt', required: true, icon: 'fas fa-laptop' },
            { id: 'library', name: 'Library Clearance', required: true, icon: 'fas fa-book-open' },
            { id: 'identity', name: 'Student ID Card', required: true, icon: 'fas fa-id-card' }
        ];

        // Initialize Dashboard
        document.addEventListener('DOMContentLoaded', function() {
            checkAuthentication();
            generateUploadSection();
            generateDocumentStatus();
        });

        // Supabase Authentication Check
async function checkAuthentication() {
    try {
        // Check if user is authenticated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // If not authenticated, redirect to login page
        if (error || !user) {
            window.location.href = './index.html';
            return;
        }

        // If authenticated, continue with the app
        studentData.id = user.id;
        studentData.email = user.email;
        studentData.name = user.user_metadata?.full_name || user.email;
        
        // Only try to update if element exists
        const welcomeElement = document.getElementById('studentName');
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${studentData.name}`;
        }
        
        await loadStudentProfile();
        await loadStudentDocuments();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        // If any error occurs, redirect to login
        window.location.href = './index.html';
    }
}

// Run this check when the page loads
checkAuthentication();


// Add to your supabase initialization
const ADMIN_ROLE = 'clearance_admin';

async function checkAdminAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = './admin-login.html';
            return;
        }

        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        if (roleError || !roleData || roleData.role !== ADMIN_ROLE) {
            window.location.href = './unauthorized.html';
            return;
        }

        // Load admin dashboard
        loadAdminDashboard();
        
    } catch (error) {
        console.error('Admin auth error:', error);
        window.location.href = './admin-login.html';
    }
}

        // Load Student Profile from Supabase
        async function loadStudentProfile() {
            try {
                const { data, error } = await supabase
                    .from('student_profiles')
                    .select('*')
                    .eq('user_id', studentData.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                    throw error;
                }

                if (data) {
                    studentData.profileComplete = true;
                    updateProfileDisplay(data);
                    document.getElementById('profileAlert').classList.add('hidden');
                    
                    // Enable upload buttons
                    const uploadButtons = document.querySelectorAll('.upload-btn');
                    uploadButtons.forEach(btn => {
                        btn.disabled = false;
                        btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    });
                } else {
                    studentData.profileComplete = false;
                    document.getElementById('profileAlert').classList.remove('hidden');
                    
                    // Disable upload buttons
                    const uploadButtons = document.querySelectorAll('.upload-btn');
                    uploadButtons.forEach(btn => {
                        btn.disabled = true;
                        btn.classList.add('opacity-50', 'cursor-not-allowed');
                    });
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                showNotification('Error loading profile data', 'error');
            }
        }

        // Load Student Documents from Supabase
        async function loadStudentDocuments() {
            try {
                const { data, error } = await supabase
                    .from('student_documents')
                    .select('*')
                    .eq('user_id', studentData.id);

                if (error) throw error;

                studentData.documents = {};
                data.forEach(doc => {
                    studentData.documents[doc.document_type] = {
                        id: doc.id,
                        name: doc.file_name,
                        size: doc.file_size,
                        uploadDate: doc.created_at,
                        status: doc.status,
                        file_url: doc.file_url,
                        admin_remarks: doc.admin_remarks
                    };
                });

                updateDocumentUI();
                updateProgress();
            } catch (error) {
                console.error('Error loading documents:', error);
                showNotification('Error loading documents', 'error');
            }
        }

        function updateDocumentUI() {
            Object.keys(studentData.documents).forEach(docId => {
                const statusElement = document.getElementById(`status_${docId}`);
                const docStatusElement = document.getElementById(`docStatus_${docId}`);
                
                if (statusElement) {
                    statusElement.innerHTML = `
                        <span class="text-xs text-green-600">
                            <i class="fas fa-check-circle mr-1"></i>Uploaded
                        </span>
                    `;
                    statusElement.classList.remove('hidden');
                }
                
                if (docStatusElement) {
                    const docData = studentData.documents[docId];
                    docStatusElement.innerHTML = `
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(docData.status)}">
                            ${getStatusText(docData.status)}
                        </span>
                    `;
                }
            });
        }

        function updateProfileDisplay(profileData) {
            document.getElementById('displayName').textContent = profileData.full_name || 'Complete Profile';
            document.getElementById('displayRegNumber').textContent = profileData.reg_number || 'Reg Number';
            document.getElementById('displayDepartment').textContent = profileData.department || 'Department';
            document.getElementById('displayYear').textContent = `${profileData.clearance_year || 'Year'} Clearance`;
            
            if (profileData.profile_image_url) {
                document.getElementById('profileImage').src = profileData.profile_image_url;
            }
        }

        function generateUploadSection() {
            const uploadSection = document.getElementById('uploadSection');
            
            requiredDocuments.forEach(doc => {
                const uploadCard = document.createElement('div');
                uploadCard.className = 'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors';
                uploadCard.innerHTML = `
                    <div class="mb-4">
                        <i class="${doc.icon} text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-sm font-medium text-gray-900 mb-2">${doc.name}</h3>
                    <p class="text-xs text-gray-500 mb-4">${doc.required ? 'Required' : 'Optional'}</p>
                    <input type="file" id="file_${doc.id}" class="hidden" accept=".pdf,.jpg,.jpeg,.png" 
                           onchange="handleFileUpload('${doc.id}', this)">
                    <button onclick="document.getElementById('file_${doc.id}').click()" 
                            class="upload-btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                        <i class="fas fa-upload mr-2"></i>Upload
                    </button>
                    <div id="status_${doc.id}" class="mt-2 hidden">
                        <span class="text-xs text-green-600">
                            <i class="fas fa-check-circle mr-1"></i>Uploaded
                        </span>
                    </div>
                `;
                uploadSection.appendChild(uploadCard);
            });
        }

        function generateDocumentStatus() {
            const statusContainer = document.getElementById('documentStatus');
            
            requiredDocuments.forEach(doc => {
                const statusItem = document.createElement('div');
                statusItem.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
                statusItem.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <div class="flex-shrink-0">
                            <i class="${doc.icon} text-gray-400"></i>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${doc.name}</p>
                            <p class="text-xs text-gray-500">${doc.required ? 'Required' : 'Optional'}</p>
                        </div>
                    </div>
                    <div id="docStatus_${doc.id}">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Uploaded
                        </span>
                    </div>
                `;
                statusContainer.appendChild(statusItem);
            });
        }

        async function handleFileUpload(docId, input) {
            if (!studentData.profileComplete) {
                showNotification('Please complete your profile before uploading documents.', 'error');
                return;
            }

            const file = input.files[0];
            if (!file) return;

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showNotification('File size must be less than 5MB', 'error');
                return;
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                showNotification('Please upload PDF, JPEG, or PNG files only', 'error');
                return;
            }

            try {
                await uploadFileToSupabase(docId, file);
            } catch (error) {
                console.error('Upload error:', error);
                showNotification('Upload failed. Please try again.', 'error');
            }
        }

        async function uploadFileToSupabase(docId, file) {
            // Show loading state
            const statusElement = document.getElementById(`status_${docId}`);
            const docStatusElement = document.getElementById(`docStatus_${docId}`);
            
            statusElement.innerHTML = `
                <span class="text-xs text-blue-600">
                    <i class="fas fa-spinner fa-spin mr-1"></i>Uploading...
                </span>
            `;
            statusElement.classList.remove('hidden');

            try {
                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${studentData.id}/${docId}/${Date.now()}.${fileExt}`;

                // Upload file to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('student-documents')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('student-documents')
                    .getPublicUrl(fileName);

                // Save document record to database
                const documentData = {
                    user_id: studentData.id,
                    document_type: docId,
                    file_name: file.name,
                    file_size: file.size,
                    file_url: urlData.publicUrl,
                    storage_path: fileName,
                    status: 'pending'
                };

                // Check if document already exists
                const { data: existingDoc } = await supabase
                    .from('student_documents')
                    .select('id')
                    .eq('user_id', studentData.id)
                    .eq('document_type', docId)
                    .single();

                if (existingDoc) {
                    // Update existing document
                    const { error: updateError } = await supabase
                        .from('student_documents')
                        .update(documentData)
                        .eq('id', existingDoc.id);

                    if (updateError) throw updateError;
                } else {
                    // Insert new document
                    const { error: insertError } = await supabase
                        .from('student_documents')
                        .insert([documentData]);

                    if (insertError) throw insertError;
                }

                // Update local state
                studentData.documents[docId] = {
                    name: file.name,
                    size: file.size,
                    uploadDate: new Date().toISOString(),
                    status: 'pending',
                    file_url: urlData.publicUrl
                };

                // Update UI
                statusElement.innerHTML = `
                    <span class="text-xs text-green-600">
                        <i class="fas fa-check-circle mr-1"></i>Uploaded
                    </span>
                `;

                docStatusElement.innerHTML = `
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending Review
                    </span>
                `;

                updateProgress();
                showNotification('Document uploaded successfully!', 'success');

            } catch (error) {
                console.error('Upload error:', error);
                statusElement.innerHTML = `
                    <span class="text-xs text-red-600">
                        <i class="fas fa-exclamation-circle mr-1"></i>Upload Failed
                    </span>
                `;
                throw error;
            }
        }

        function updateProgress() {
            const totalRequired = requiredDocuments.filter(doc => doc.required).length;
            const uploadedRequired = Object.keys(studentData.documents).filter(docId => 
                requiredDocuments.find(doc => doc.id === docId && doc.required)
            ).length;
            
            const totalUploaded = Object.keys(studentData.documents).length;
            const progressPercent = Math.round((uploadedRequired / totalRequired) * 100);
            
            document.getElementById('progressPercent').textContent = `${progressPercent}%`;
            document.getElementById('progressBar').style.width = `${progressPercent}%`;
            document.getElementById('uploadedCount').textContent = `${totalUploaded}/${requiredDocuments.length} Uploaded`;
            
            // Update approved and rejected counts
            const approvedCount = Object.values(studentData.documents).filter(doc => doc.status === 'approved').length;
            const rejectedCount = Object.values(studentData.documents).filter(doc => doc.status === 'rejected').length;
            
            document.getElementById('approvedCount').textContent = `${approvedCount} Approved`;
            document.getElementById('rejectedCount').textContent = `${rejectedCount} Rejected`;
        }

        function openProfileModal() {
            document.getElementById('profileModal').classList.remove('hidden');
            document.getElementById('profileModal').classList.add('flex');
            
            // Load existing profile data
            loadProfileFormData();
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.add('hidden');
            document.getElementById('profileModal').classList.remove('flex');
        }

        function previewImage(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('modalProfileImage').src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        document.getElementById('profileForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const profileData = {
                fullName: document.getElementById('studentFullName').value,
                regNumber: document.getElementById('regNumber').value,
                department: document.getElementById('department').value,
                school: document.getElementById('school').value,
                clearanceYear: document.getElementById('clearanceYear').value,
                phoneNumber: document.getElementById('phoneNumber').value,
                profileImage: document.getElementById('modalProfileImage').src
            };

            // Save to localStorage (in real app, this would be Supabase)
            localStorage.setItem('studentProfile', JSON.stringify(profileData));
            
            // Update profile display
            updateProfileDisplay(profileData);
            
            // Update profile completion status
            studentData.profileComplete = true;
            document.getElementById('profileAlert').classList.add('hidden');
            
            // Enable upload buttons
            const uploadButtons = document.querySelectorAll('.upload-btn');
            uploadButtons.forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });

            closeProfileModal();
            
            // Show success message
            showNotification('Profile saved successfully!', 'success');
        });

        function viewDocuments() {
            const documentModal = document.getElementById('documentModal');
            const documentList = document.getElementById('documentList');
            
            documentModal.classList.remove('hidden');
            documentModal.classList.add('flex');
            
            // Clear previous content
            documentList.innerHTML = '';
            
            if (Object.keys(studentData.documents).length === 0) {
                documentList.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-file-upload text-4xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500">No documents uploaded yet</p>
                    </div>
                `;
                return;
            }

            // Display uploaded documents
            Object.entries(studentData.documents).forEach(([docId, docData]) => {
                const docInfo = requiredDocuments.find(doc => doc.id === docId);
                const docElement = document.createElement('div');
                docElement.className = 'flex items-center justify-between p-4 border border-gray-200 rounded-lg';
                docElement.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <div class="flex-shrink-0">
                            <i class="${docInfo.icon} text-2xl text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-medium text-gray-900">${docInfo.name}</h3>
                            <p class="text-xs text-gray-500">${docData.name}</p>
                            <p class="text-xs text-gray-400">Uploaded: ${new Date(docData.uploadDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(docData.status)}">
                            ${getStatusText(docData.status)}
                        </span>
                        <button onclick="downloadDocument('${docId}')" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                `;
                documentList.appendChild(docElement);
            });
        }

        function closeDocumentModal() {
            document.getElementById('documentModal').classList.add('hidden');
            document.getElementById('documentModal').classList.remove('flex');
        }

        function getStatusColor(status) {
            switch(status) {
                case 'approved': return 'bg-green-100 text-green-800';
                case 'rejected': return 'bg-red-100 text-red-800';
                case 'pending': return 'bg-yellow-100 text-yellow-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        }

        function getStatusText(status) {
            switch(status) {
                case 'approved': return 'Approved';
                case 'rejected': return 'Rejected';
                case 'pending': return 'Pending Review';
                default: return 'Unknown';
            }
        }

        function downloadDocument(docId) {
            // In real implementation, this would download from Supabase storage
            showNotification('Document download started', 'info');
        }

        function downloadReport() {
            // Generate and download clearance report
            const profileData = JSON.parse(localStorage.getItem('studentProfile') || '{}');
            const reportData = {
                student: profileData,
                documents: studentData.documents,
                progress: document.getElementById('progressPercent').textContent,
                generatedDate: new Date().toISOString()
            };
            
            const reportContent = generateReportHTML(reportData);
            const blob = new Blob([reportContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FUTO_Clearance_Report_${profileData.regNumber || 'Student'}.html`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('Report downloaded successfully!', 'success');
        }

        function generateReportHTML(data) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>FUTO Clearance Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .section { margin-bottom: 20px; }
                        .document-item { padding: 10px; border-bottom: 1px solid #eee; }
                        .status-approved { color: green; }
                        .status-pending { color: orange; }
                        .status-rejected { color: red; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>FUTO Student Clearance Report</h1>
                        <h2>Federal University of Technology, Owerri</h2>
                    </div>
                    
                    <div class="section">
                        <h3>Student Information</h3>
                        <p><strong>Name:</strong> ${data.student.fullName || 'N/A'}</p>
                        <p><strong>Registration Number:</strong> ${data.student.regNumber || 'N/A'}</p>
                        <p><strong>Department:</strong> ${data.student.department || 'N/A'}</p>
                        <p><strong>School:</strong> ${data.student.school || 'N/A'}</p>
                        <p><strong>Year of Clearance:</strong> ${data.student.clearanceYear || 'N/A'}</p>
                    </div>
                    
                    <div class="section">
                        <h3>Clearance Progress: ${data.progress}</h3>
                    </div>
                    
                    <div class="section">
                        <h3>Document Status</h3>
                        ${Object.entries(data.documents).map(([docId, docData]) => {
                            const docInfo = requiredDocuments.find(doc => doc.id === docId);
                            return `
                                <div class="document-item">
                                    <strong>${docInfo.name}:</strong> 
                                    <span class="status-${docData.status}">${getStatusText(docData.status)}</span>
                                    <br><small>Uploaded: ${new Date(docData.uploadDate).toLocaleDateString()}</small>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="section">
                        <p><strong>Report Generated:</strong> ${new Date(data.generatedDate).toLocaleString()}</p>
                    </div>
                </body>
                </html>
            `;
        }

        function loadStudentData() {
            // Load documents from localStorage (in real app, this would be from Supabase)
            const savedDocuments = localStorage.getItem('studentDocuments');
            if (savedDocuments) {
                studentData.documents = JSON.parse(savedDocuments);
                updateProgress();
                
                // Update document status displays
                Object.keys(studentData.documents).forEach(docId => {
                    const statusElement = document.getElementById(`status_${docId}`);
                    const docStatusElement = document.getElementById(`docStatus_${docId}`);
                    
                    if (statusElement) {
                        statusElement.innerHTML = `
                            <span class="text-xs text-green-600">
                                <i class="fas fa-check-circle mr-1"></i>Uploaded
                            </span>
                        `;
                        statusElement.classList.remove('hidden');
                    }
                    
                    if (docStatusElement) {
                        const docData = studentData.documents[docId];
                        docStatusElement.innerHTML = `
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(docData.status)}">
                                ${getStatusText(docData.status)}
                            </span>
                        `;
                    }
                });
            }
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                type === 'info' ? 'bg-blue-500 text-white' :
                'bg-gray-500 text-white'
            }`;
            notification.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas ${
                        type === 'success' ? 'fa-check-circle' :
                        type === 'error' ? 'fa-exclamation-circle' :
                        type === 'info' ? 'fa-info-circle' :
                        'fa-bell'
                    }"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }

        async function logout() {
    if (!confirm('Are you sure you want to logout?')) {
        return; // User cancelled logout
    }

    try {
        // Show loading state
        showNotification('Logging out...', 'info');
        
        // Clear all local data
        localStorage.removeItem('studentProfile');
        localStorage.removeItem('studentDocuments');
        localStorage.removeItem('supabase.auth.token'); // Clear Supabase auth token if exists
        sessionStorage.clear(); // Clear all session data
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            throw error;
        }
        
        // Clear any remaining auth state
        document.cookie = 'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        document.cookie = 'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        
        showNotification('Logged out successfully', 'success');
        
        // Redirect to login page with a parameter to prevent auto-login
        setTimeout(() => {
            window.location.href = '/index.html?logout=true';
        }, 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
        
        // Force redirect anyway
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
    }
}

        // Handle responsive sidebar toggle (for mobile)
        function toggleMobileMenu() {
            // Implementation for mobile menu toggle if needed
        }

        // Initialize tooltips and other UI enhancements
        document.addEventListener('DOMContentLoaded', function() {
            // Add smooth scrolling
            document.documentElement.style.scrollBehavior = 'smooth';
            
            // Add intersection observer for animations
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            });

            // Observe all cards for animation
            document.querySelectorAll('.card-hover').forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
        });

        // Handle window resize for responsive adjustments
        window.addEventListener('resize', function() {
            // Handle responsive adjustments if needed
        });

        // Prevent form submission on Enter key for file inputs
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.target.type === 'file') {
                e.preventDefault();
            }
        });

        async function loadProfileFormData() {
    try {
        const { data, error } = await supabase
            .from('student_profiles')
            .select('*')
            .eq('user_id', studentData.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            document.getElementById('studentFullName').value = data.full_name || '';
            document.getElementById('regNumber').value = data.reg_number || '';
            document.getElementById('department').value = data.department || '';
            document.getElementById('school').value = data.school || '';
            document.getElementById('clearanceYear').value = data.clearance_year || '';
            document.getElementById('phoneNumber').value = data.phone_number || '';
            
            if (data.profile_image_url) {
                document.getElementById('modalProfileImage').src = data.profile_image_url;
            }
        }
    } catch (error) {
        console.error('Error loading profile form data:', error);
    }
}

async function loadProfileFormData() {
            try {
                const { data, error } = await supabase
                    .from('student_profiles')
                    .select('*')
                    .eq('user_id', studentData.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (data) {
                    document.getElementById('studentFullName').value = data.full_name || '';
                    document.getElementById('regNumber').value = data.reg_number || '';
                    document.getElementById('department').value = data.department || '';
                    document.getElementById('school').value = data.school || '';
                    document.getElementById('clearanceYear').value = data.clearance_year || '';
                    document.getElementById('phoneNumber').value = data.phone_number || '';
                    
                    if (data.profile_image_url) {
                        document.getElementById('modalProfileImage').src = data.profile_image_url;
                    }
                }
            } catch (error) {
                console.error('Error loading profile form data:', error);
            }
        }

        function closeProfileModal() {
            document.getElementById('profileModal').classList.add('hidden');
            document.getElementById('profileModal').classList.remove('flex');
        }

        function previewImage(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('modalProfileImage').src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        document.getElementById('profileForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            try {
                let profileImageUrl = null;
                const profileImageInput = document.getElementById('profileImageInput');
                
                // Upload profile image if selected
                if (profileImageInput.files[0]) {
                    const file = profileImageInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${studentData.id}/profile/avatar.${fileExt}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('profile-images')
                        .upload(fileName, file, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage
                        .from('profile-images')
                        .getPublicUrl(fileName);

                    profileImageUrl = urlData.publicUrl;
                }

                const profileData = {
                    user_id: studentData.id,
                    full_name: document.getElementById('studentFullName').value,
                    reg_number: document.getElementById('regNumber').value,
                    department: document.getElementById('department').value,
                    school: document.getElementById('school').value,
                    clearance_year: document.getElementById('clearanceYear').value,
                    phone_number: document.getElementById('phoneNumber').value,
                    email: studentData.email
                };

                if (profileImageUrl) {
                    profileData.profile_image_url = profileImageUrl;
                }

                // Check if profile exists
                const { data: existingProfile } = await supabase
                    .from('student_profiles')
                    .select('id')
                    .eq('user_id', studentData.id)
                    .single();

                if (existingProfile) {
                    // Update existing profile
                    const { error: updateError } = await supabase
                        .from('student_profiles')
                        .update(profileData)
                        .eq('user_id', studentData.id);

                    if (updateError) throw updateError;
                } else {
                    // Insert new profile
                    const { error: insertError } = await supabase
                        .from('student_profiles')
                        .insert([profileData]);

                    if (insertError) throw insertError;
                }

                // Update local state and UI
                updateProfileDisplay(profileData);
                studentData.profileComplete = true;
                document.getElementById('profileAlert').classList.add('hidden');
                
                // Enable upload buttons
                const uploadButtons = document.querySelectorAll('.upload-btn');
                uploadButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                });

                closeProfileModal();
                showNotification('Profile saved successfully!', 'success');
            } catch (error) {
                console.error('Error saving profile:', error);
                showNotification('Error saving profile. Please try again.', 'error');
            }
        });


        // FUTO Chatbot JavaScript
const chatData = {
    "How do I complete my profile?": {
        answer: "To complete your profile:\n\n1. Click the 'Edit Profile' button or the edit icon on your profile picture\n2. Fill in all required fields: Full Name, Registration Number, Department, School, and Year of Clearance\n3. Upload a clear profile photo\n4. Add your phone number for communication\n5. Click 'Save Profile'\n\nYour profile must be completed before uploading clearance documents.",
        followUp: ["What documents do I need to upload?", "How do I upload documents?", "What if my profile won't save?"]
    },
    "What documents do I need to upload?": {
        answer: "You need to upload 8 different clearance documents:\n\n• Library Clearance\n• Departmental Clearance\n• Faculty Clearance\n• Registry Clearance\n• Bursary Clearance\n• Student Affairs Clearance\n• Hostel Clearance (if applicable)\n• Medical Clearance\n\nEach document should be a clear PDF or image file. Make sure all documents are properly signed and stamped by the respective offices.",
        followUp: ["How do I upload documents?", "What file formats are accepted?", "What if a document is rejected?"]
    },
    "How do I upload documents?": {
        answer: "To upload your clearance documents:\n\n1. Complete your profile first\n2. In the 'Upload Requirements' section, click on any document card\n3. Select the appropriate file from your device\n4. Wait for the upload to complete\n5. Check the document status section for approval updates\n\nSupported formats: PDF, JPG, PNG (Max size: 5MB per file). Ensure documents are clear and readable.",
        followUp: ["What file formats are accepted?", "What if upload fails?", "How long does approval take?"]
    },
    "What file formats are accepted?": {
        answer: "Accepted file formats:\n\n✅ PDF (.pdf) - Recommended\n✅ JPEG (.jpg, .jpeg)\n✅ PNG (.png)\n\n📏 Maximum file size: 5MB per document\n📱 Minimum resolution: 300 DPI for clear text\n\nTips for best results:\n• Scan documents at high quality\n• Ensure all text is readable\n• Avoid blurry or dark images\n• Use PDF format when possible",
        followUp: ["How do I upload documents?", "What if my file is too large?", "What makes a good document scan?"]
    },
    "How long does approval take?": {
        answer: "Document approval timeline:\n\n⏰ Standard Processing: 3-5 business days\n🚀 Peak periods: 7-10 business days\n📧 You'll receive email notifications for status updates\n\nStatus meanings:\n• 🟡 Pending: Under review\n• ✅ Approved: Document accepted\n• ❌ Rejected: Needs resubmission\n\nCheck your dashboard regularly for real-time status updates.",
        followUp: ["What if a document is rejected?", "How do I check my progress?", "Can I contact someone about delays?"]
    },
    "What if a document is rejected?": {
        answer: "If your document is rejected:\n\n1. 📧 Check your email for rejection reasons\n2. 🔍 Review the feedback provided\n3. ✏️ Correct the issues mentioned\n4. 📤 Re-upload the corrected document\n\nCommon rejection reasons:\n• Unclear or blurry image\n• Missing signatures/stamps\n• Wrong document type\n• Expired clearance date\n\nEnsure all requirements are met before resubmitting.",
        followUp: ["How do I upload documents?", "What makes a good document scan?", "How do I contact support?"]
    },
    "How do I check my progress?": {
        answer: "Monitor your clearance progress through:\n\n📊 Progress Overview Card:\n• Shows overall completion percentage\n• Displays upload, approval, and rejection counts\n• Visual progress bar\n\n📋 Document Status Section:\n• Individual document status\n• Real-time updates\n• Action buttons for rejected items\n\n📱 The dashboard updates automatically when new approvals come in.",
        followUp: ["What do the status colors mean?", "How often is progress updated?", "Can I download my clearance report?"]
    },
    "Can I download my clearance report?": {
        answer: "Yes! Once all documents are approved:\n\n1. ✅ Complete all 8 document uploads\n2. ⏳ Wait for all approvals\n3. 📥 Click 'Download Report' in Quick Actions\n4. 📄 Get your official clearance certificate\n\nThe report includes:\n• Your complete profile information\n• All approved clearance documents\n• Official FUTO clearance stamp\n• QR code for verification\n\n⚠️ Report is only available when 100% complete.",
        followUp: ["What if not all documents are approved?", "Is the report officially recognized?", "How do I contact support?"]
    },
    "How do I contact support?": {
        answer: "Get help through multiple channels:\n\n📞 Support Options:\n• Click 'Contact Support' in the Help section\n• Email: clearance@futo.edu.ng\n• Phone: +234-XXX-XXX-XXXX\n• Visit: Student Affairs Office\n\n🕒 Support Hours:\n• Monday - Friday: 8:00 AM - 5:00 PM\n• Response time: Within 24 hours\n\nFor urgent issues, visit the Student Affairs Office directly with your registration number and clearance documents.",
        followUp: ["What information should I provide when contacting support?", "What are common technical issues?", "How do I reset my password?"]
    },
    "What are common technical issues?": {
        answer: "Common issues and solutions:\n\n🔧 Upload Problems:\n• Check internet connection\n• Reduce file size below 5MB\n• Use supported formats (PDF, JPG, PNG)\n• Clear browser cache\n\n👤 Profile Issues:\n• Ensure all required fields are filled\n• Use valid registration number format\n• Check department/school selection\n\n🔄 If problems persist:\n• Try a different browser\n• Disable ad blockers\n• Contact technical support",
        followUp: ["How do I contact support?", "What file formats are accepted?", "How do I complete my profile?"]
    }
};

let currentQuestions = Object.keys(chatData);
let chatHistory = [];

function initializeFUTOChat() {
    displayQuestions(currentQuestions);
}

function displayQuestions(questions) {
    const container = document.getElementById('questionsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    questions.forEach(question => {
        const button = document.createElement('button');
        button.className = 'question-btn w-full text-left p-2 md:p-2 rounded-lg text-xs md:text-xs bg-white hover:bg-green-50 text-gray-700';
        button.textContent = question;
        button.onclick = () => handleQuestionClick(question);
        container.appendChild(button);
    });
}

function handleQuestionClick(question) {
    // Add user message
    addMessage(question, 'user');
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate processing delay
    setTimeout(() => {
        hideTypingIndicator();
        
        const response = chatData[question];
        if (response) {
            addMessage(response.answer, 'bot');
            
            // Update available questions with follow-up questions
            if (response.followUp && response.followUp.length > 0) {
                currentQuestions = response.followUp;
                displayQuestions(currentQuestions);
            }
        }
    }, 1000);
}

function addMessage(message, sender) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    
    if (sender === 'user') {
        messageDiv.className = 'flex items-start space-x-2 justify-end';
        messageDiv.innerHTML = `
            <div class="chat-bubble-user text-white p-3 rounded-2xl rounded-tr-sm max-w-xs md:max-w-xs">
                <p class="text-sm">${message}</p>
            </div>
            <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user text-gray-600 text-xs"></i>
            </div>
        `;
    } else {
        messageDiv.className = 'flex items-start space-x-2';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white text-xs"></i>
            </div>
            <div class="chat-bubble-bot text-gray-800 p-3 rounded-2xl rounded-tl-sm max-w-xs md:max-w-xs">
                <p class="text-sm whitespace-pre-line">${message}</p>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    chatHistory.push({message, sender});
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'flex items-start space-x-2';
    typingDiv.innerHTML = `
        <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-xs"></i>
        </div>
        <div class="chat-bubble-bot text-gray-800 p-3 rounded-2xl rounded-tl-sm max-w-xs typing-indicator">
            <p class="text-sm">Typing...</p>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatToggle = document.getElementById('chatToggle');
    
    if (!chatWindow || !chatToggle) return;
    
    if (chatWindow.classList.contains('hidden')) {
        chatWindow.classList.remove('hidden');
        chatToggle.innerHTML = '<i class="fas fa-times text-xl"></i>';
    } else {
        chatWindow.classList.add('hidden');
        chatToggle.innerHTML = '<i class="fas fa-comments text-xl"></i>';
    }
}

function resetChat() {
    // Clear chat messages except welcome message
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const welcomeMessage = messagesContainer.children[0];
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(welcomeMessage);
    
    // Reset questions to original set
    currentQuestions = Object.keys(chatData);
    displayQuestions(currentQuestions);
    
    // Clear chat history
    chatHistory = [];
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure DOM is fully loaded
    setTimeout(initializeFUTOChat, 100);
});


        