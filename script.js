let editingPostId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // เช็กสถานะการล็อกอิน
    const checkAuthInterval = setInterval(() => {
        if (window.fb && window.auth) {
            clearInterval(checkAuthInterval);
            window.fb.onAuthStateChanged(window.auth, (user) => {
                currentUser = user;
                updateUIVisibility(user);
                loadPostsFromCloud();
            });
        }
    }, 100);

    // ปุ่มสลับฟอร์มล็อกอิน
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.style.display = (loginForm.style.display === 'none' || loginForm.style.display === '') ? 'block' : 'none';
            }
        });
    }

    // ปุ่มออกจากระบบ
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // ผูก Event Submit
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

function updateUIVisibility(user) {
    const postForm = document.getElementById('postForm');
    const formHr = document.getElementById('formHr');
    const loginSection = document.getElementById('loginSection');

    if (user) {
        if (postForm) postForm.style.display = 'block';
        if (formHr) formHr.style.display = 'block';
        if (loginSection) loginSection.style.display = 'none';
    } else {
        if (postForm) postForm.style.display = 'none';
        if (formHr) formHr.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        await window.fb.signInWithEmailAndPassword(window.auth, email, password);
        alert('เข้าสู่ระบบสำเร็จ!');
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error("Login failed:", error);
        alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
}

async function handleLogout() {
    try {
        await window.fb.signOut(window.auth);
        alert('ออกจากระบบแล้ว');
        resetFormState();
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

async function loadPostsFromCloud() {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer) return;
    
    cardContainer.innerHTML = '<p style="text-align:center; color:#78716c;">กำลังโหลดข้อมูล...</p>';

    try {
        if (!window.fb || !window.db) return;

        const postsRef = window.fb.collection(window.db, "posts");
        const q = window.fb.query(postsRef, window.fb.orderBy("timestamp", "desc"));
        const querySnapshot = await window.fb.getDocs(q);

        cardContainer.innerHTML = '';

        if (querySnapshot.empty) {
            cardContainer.innerHTML = '<p style="text-align:center; color:#78716c;">ยังไม่มีโพสต์ประสบการณ์ในขณะนี้</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const card = createCardElement(docSnap.id, data);
            cardContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading posts: ", error);
        cardContainer.innerHTML = '<p style="text-align:center; color:#ef4444;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function createCardElement(id, data) {
    const card = document.createElement('div');
    card.className = 'card';

    let actionButtons = '';
    if (currentUser) {
        actionButtons = `
            <div class="card-actions" style="display: flex; gap: 8px;">
                <button onclick="prepareEditPost('${id}', \`${escapeQuotes(data.title)}\`, \`${escapeQuotes(data.content)}\`, '${data.category}')" 
                        style="background: #f59e0b; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">แก้ไข</button>
                <button onclick="deletePost('${id}')" 
                        style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">ลบ</button>
            </div>
        `;
    }

    let imagesHTML = '';
    if (data.images && data.images.length > 0) {
        imagesHTML = `<div class="image-gallery">` + 
            data.images.map(img => `<img src="${img}" alt="รูปภาพ">`).join('') + 
            `</div>`;
    }

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align- items: center;">
            <span class="badge">${data.category || 'ทั่วไป'}</span>
            ${actionButtons}
        </div>
        <h3>${data.title}</h3>
        <p>${data.content}</p>
        ${imagesHTML}
        <div class="date">โพสต์เมื่อ: ${data.date || 'ไม่ระบุวันที่'}</div>
    `;

    return card;
}

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

// อัปโหลดรูปภาพแบบขนาน (Parallel Upload) เพื่อความเร็วสูงสุด
async function handlePostSubmit(event) {
    event.preventDefault();

    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const categoryInput = document.getElementById('category');
    const imageInput = document.getElementById('images');
    const submitBtn = document.querySelector('#postForm button[type="submit"]');

    if (!titleInput || !contentInput) return;

    const title = titleInput.value;
    const content = contentInput.value;
    const category = categoryInput ? categoryInput.value : 'ทั่วไป';
    
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'กำลังประมวลผลและอัปโหลด...';
    submitBtn.disabled = true;

    let imageUrls = [];
    if (imageInput && imageInput.files.length > 0) {
        const files = Array.from(imageInput.files);

        // ทำการย่อขนาดและอัปโหลดรูปภาพทุกรูปพร้อมกัน (Parallel)
        const uploadPromises = files.map(async (file, index) => {
            try {
                // 1. ย่อขนาดรูปภาพอย่างรวดเร็วผ่าน Object URL
                const resizedBlob = await resizeImageToBlobFast(file, 800, 0.6);
                
                // 2. ส่งขึ้น Firebase Storage
                const fileName = `images/${Date.now()}_${index}_compressed.jpg`;
                const storageRef = window.fb.ref(window.storage, fileName);
                
                await window.fb.uploadBytes(storageRef, resizedBlob);
                return await window.fb.getDownloadURL(storageRef);
            } catch (err) {
                console.error(`Upload error on file ${index}:`, err);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        imageUrls = results.filter(url => url !== null);
    }

    try {
        if (editingPostId) {
            const postRef = window.fb.doc(window.db, "posts", editingPostId);
            const updateData = { title, content, category };
            if (imageUrls.length > 0) updateData.images = imageUrls;

            await window.fb.updateDoc(postRef, updateData);
            alert('อัปเดตโพสต์เรียบร้อยแล้ว!');
            resetFormState();
        } else {
            const newPost = {
                title, content, category, 
                images: imageUrls,
                date: new Date().toLocaleDateString('th-TH'),
                timestamp: Date.now()
            };

            await window.fb.addDoc(window.fb.collection(window.db, "posts"), newPost);
            alert('บันทึกโพสต์เรียบร้อยแล้ว!');
            document.getElementById('postForm').reset();
        }

        loadPostsFromCloud();
    } catch (error) {
        console.error("Error saving post: ", error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
}

// ฟังก์ชันย่อรูปภาพความเร็วสูง (High Performance Compression)
function resizeImageToBlobFast(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;

        img.onload = () => {
            URL.revokeObjectURL(objectUrl); // คืนค่าหน่วยความจำทันที

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Canvas compression failed"));
                }
            }, 'image/jpeg', quality);
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
    });
}

function prepareEditPost(id, title, content, category) {
    editingPostId = id;
    
    document.getElementById('title').value = title;
    document.getElementById('content').value = content;
    if (document.getElementById('category')) {
        document.getElementById('category').value = category;
    }

    const submitBtn = document.querySelector('#postForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = 'บันทึกการแก้ไข';
        submitBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    }

    document.getElementById('postForm').scrollIntoView({ behavior: 'smooth' });
}

function resetFormState() {
    editingPostId = null;
    document.getElementById('postForm').reset();
    const submitBtn = document.querySelector('#postForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = 'เผยแพร่โพสต์';
        submitBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
    }
}

async function deletePost(id) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้?')) return;

    try {
        await window.fb.deleteDoc(window.fb.doc(window.db, "posts", id));
        alert('ลบโพสต์เรียบร้อยแล้ว!');
        loadPostsFromCloud();
    } catch (error) {
        console.error("Error deleting post: ", error);
        alert('เกิดข้อผิดพลาดในการลบโพสต์');
    }
}
