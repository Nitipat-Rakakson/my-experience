let editingPostId = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // ตรวจสอบสถานะการล็อกอิน
    setTimeout(() => {
        if (window.fb && window.auth) {
            window.fb.onAuthStateChanged(window.auth, (user) => {
                currentUser = user;
                updateUIVisibility(user);
                loadPostsFromCloud();
            });
        }
    }, 500);

    // ผูก Event ฟอร์มโพสต์
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }

    // ผูก Event เข้าสู่ระบบ
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // ปุ่มแสดงฟอร์มล็อกอิน
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            const loginForm = document.getElementById('loginForm');
            loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
        });
    }

    // ปุ่มออกจากระบบ
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// ปรับการแสดงผล UI ตามสถานะล็อกอิน
function updateUIVisibility(user) {
    const postForm = document.getElementById('postForm');
    const formHr = document.getElementById('formHr');
    const loginSection = document.getElementById('loginSection');

    if (user) {
        // ถ้าเป็น Admin (ล็อกอินแล้ว)
        if (postForm) postForm.style.display = 'block';
        if (formHr) formHr.style.display = 'block';
        if (loginSection) loginSection.style.display = 'none';
    } else {
        // ถ้าเป็นคนทั่วไป (ยังไม่ล็อกอิน)
        if (postForm) postForm.style.display = 'none';
        if (formHr) formHr.style.display = 'none';
        if (loginSection) loginSection.style.display = 'block';
    }
}

// ฟังก์ชันเข้าสู่ระบบ
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

// ฟังก์ชันออกจากระบบ
async function handleLogout() {
    try {
        await window.fb.signOut(window.auth);
        alert('ออกจากระบบแล้ว');
        resetFormState();
    } catch (error) {
        console.error("Logout failed:", error);
    }
}

// ฟังก์ชันโหลดโพสต์
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

// ฟังก์ชันสร้างการ์ด (แสดงปุ่ม แก้ไข/ลบ เฉพาะเมื่อเป็น Admin)
function createCardElement(id, data) {
    const card = document.createElement('div');
    card.className = 'card';

    let actionButtons = '';
    // แสดงปุ่มก็ต่อเมื่อล็อกอินเป็น Admin
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
        <div style="display: flex; justify-content: space-between; align-items: center;">
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

// ฟังก์ชันบันทึกโพสต์
async function handlePostSubmit(event) {
    event.preventDefault();

    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');
    const categoryInput = document.getElementById('category');
    const imageInput = document.getElementById('images');

    if (!titleInput || !contentInput) return;

    const title = titleInput.value;
    const content = contentInput.value;
    const category = categoryInput ? categoryInput.value : 'ทั่วไป';
    
    let images = [];
    if (imageInput && imageInput.files.length > 0) {
        for (let file of imageInput.files) {
            const base64 = await convertFileToBase64(file);
            images.push(base64);
        }
    }

    try {
        if (editingPostId) {
            const postRef = window.fb.doc(window.db, "posts", editingPostId);
            const updateData = { title, content, category };
            if (images.length > 0) updateData.images = images;

            await window.fb.updateDoc(postRef, updateData);
            alert('อัปเดตโพสต์เรียบร้อยแล้ว!');
            resetFormState();
        } else {
            const newPost = {
                title, content, category, images,
                date: new Date().toLocaleDateString('th-TH'),
                timestamp: Date.now()
            };

            await window.fb.addDoc(window.fb.collection(window.db, "posts"), newPost);
            alert('บันทึกโพสต์ขึ้น Cloud เรียบร้อยแล้ว!');
            document.getElementById('postForm').reset();
        }

        loadPostsFromCloud();
    } catch (error) {
        console.error("Error saving post: ", error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล (อาจเนื่องจากสิทธิ์ไม่ถูกต้อง)');
    }
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

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
