// 1. ดึง Element มาใช้งาน
const expForm = document.getElementById('expForm');
const cardContainer = document.getElementById('cardContainer');
const userDisplay = document.getElementById('userDisplay');
const authBtn = document.getElementById('authBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const formTitle = document.getElementById('formTitle');
const authModal = document.getElementById('authModal');
const loginNotice = document.getElementById('loginNotice');

// 2. ดึงข้อมูลระบบ
let experiences = JSON.parse(localStorage.getItem('myExperiences')) || [];
let users = JSON.parse(localStorage.getItem('myUsers')) || [
    { username: 'admin', password: '1234', role: 'admin' } // บัญชี Admin ตั้งต้น
];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null; // ผู้ใช้ที่กำลังล็อกอินอยู่
let editIndex = null;

// --- ระบบเปิด/ปิด หน้าต่าง Modal เข้าสู่ระบบ ---
function openAuthModal() {
    if (currentUser) {
        // ถ้าล็อกอินอยู่แล้ว กดปุ่มนี้จะกลายเป็น "ออกจากระบบ"
        currentUser = null;
        localStorage.removeItem('currentUser');
        alert('ออกจากระบบเรียบร้อย');
        cancelEdit();
        updateAuthUI();
    } else {
        authModal.style.display = 'block';
    }
}

function closeAuthModal() {
    authModal.style.display = 'none';
}

function toggleAuthMode(mode) {
    if (mode === 'register') {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('registerSection').style.display = 'block';
    } else {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('registerSection').style.display = 'none';
    }
}

// --- ระบบเข้าสู่ระบบ / สมัครสมาชิก ---
function handleLogin() {
    const userIn = document.getElementById('loginUser').value.trim();
    const passIn = document.getElementById('loginPass').value.trim();

    const foundUser = users.find(u => u.username === userIn && u.password === passIn);

    if (foundUser) {
        currentUser = foundUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert(`ยินดีต้อนรับ ${currentUser.username}!`);
        closeAuthModal();
        updateAuthUI();
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
    } else {
        alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง!');
    }
}

function handleRegister() {
    const userIn = document.getElementById('regUser').value.trim();
    const passIn = document.getElementById('regPass').value.trim();

    if (!userIn || !passIn) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน!');
        return;
    }

    if (users.some(u => u.username === userIn)) {
        alert('ชื่อผู้ใช้งานนี้มีผู้ใช้แล้ว!');
        return;
    }

    const newUser = { username: userIn, password: passIn, role: 'user' };
    users.push(newUser);
    localStorage.setItem('myUsers', JSON.stringify(users));

    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    alert('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!');
    closeAuthModal();
    updateAuthUI();
    document.getElementById('regUser').value = '';
    document.getElementById('regPass').value = '';
}

// อัปเดตหน้าตาตามสถานะการล็อกอิน
function updateAuthUI() {
    if (currentUser) {
        if (currentUser.role === 'admin') {
            userDisplay.textContent = `🔑 Admin: ${currentUser.username}`;
            userDisplay.style.backgroundColor = '#e74c3c';
        } else {
            userDisplay.textContent = `👤 User: ${currentUser.username}`;
            userDisplay.style.backgroundColor = '#27ae60';
        }
        authBtn.textContent = '🚪 ออกจากระบบ';
        expForm.style.display = 'block';
        loginNotice.style.display = 'none';
    } else {
        userDisplay.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
        userDisplay.style.backgroundColor = '#7f8c8d';
        authBtn.textContent = '🔑 เข้าสู่ระบบ / สมัครสมาชิก';
        expForm.style.display = 'none';
        loginNotice.style.display = 'block';
    }
    renderExperiences();
}

// 3. ฟังก์ชันแสดงผลการ์ดประสบการณ์
function renderExperiences() {
    cardContainer.innerHTML = '';

    if (experiences.length === 0) {
        cardContainer.innerHTML = '<p style="text-align: center; color: #888;">ยังไม่มีประสบการณ์ที่ถูกบันทึก</p>';
        return;
    }

    experiences.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';

        // เช็กสิทธิ์ Admin เพื่อแสดงปุ่มแก้ไขและลบ
        const isAdmin = currentUser && currentUser.role === 'admin';
        const actionBtnsHTML = isAdmin 
            ? `<div class="action-buttons">
                <button class="edit-btn" onclick="startEdit(${index})">✏️ แก้ไข</button>
                <button class="delete-btn" onclick="deleteExperience(${index})">🗑️ ลบ</button>
               </div>` 
            : '';

        const authorBadgeHTML = (item.role === 'admin')
            ? `<span class="author-badge admin-author">👑 ${item.author || 'Admin'}</span>`
            : `<span class="author-badge user-author">👤 ${item.author || 'User'}</span>`;

        let imagesHTML = '';
        if (item.images && item.images.length > 0) {
            const imgElements = item.images.map(imgSrc => `<img src="${imgSrc}" alt="ภาพประกอบ">`).join('');
            imagesHTML = `<div class="image-gallery">${imgElements}</div>`;
        } else if (item.image) {
            imagesHTML = `<div class="image-gallery"><img src="${item.image}" alt="ภาพประกอบ"></div>`;
        }

        card.innerHTML = `
            ${actionBtnsHTML}
            <span class="badge">${item.category}</span>
            ${authorBadgeHTML}
            <p class="date">วันที่: ${item.date}</p>
            <h3>${item.title}</h3>
            <p>${item.detail}</p>
            ${imagesHTML}
        `;

        cardContainer.appendChild(card);
    });
}

// 4. การจัดการแก้ไขโพสต์
function startEdit(index) {
    const item = experiences[index];
    document.getElementById('title').value = item.title;
    document.getElementById('category').value = item.category;
    document.getElementById('date').value = item.date;
    document.getElementById('detail').value = item.detail;

    editIndex = index;
    submitBtn.textContent = 'อัปเดตประสบการณ์';
    submitBtn.style.backgroundColor = '#f39c12';
    cancelEditBtn.style.display = 'block';
    formTitle.textContent = 'แก้ไขประสบการณ์';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    editIndex = null;
    expForm.reset();
    submitBtn.textContent = 'บันทึกประสบการณ์';
    submitBtn.style.backgroundColor = '#27ae60';
    cancelEditBtn.style.display = 'none';
    formTitle.textContent = 'บันทึกประสบการณ์ของฉัน';
}

// 5. บันทึก/อัปเดตข้อมูล
expForm.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');
        return;
    }

    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const detail = document.getElementById('detail').value;
    const imageInput = document.getElementById('imageInput');
    const imageFiles = Array.from(imageInput.files);

    function readAllImages(files) {
        return Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }));
    }

    if (imageFiles.length > 0) {
        readAllImages(imageFiles).then(imageUrls => {
            saveData(imageUrls);
        });
    } else {
        const existingImages = (editIndex !== null) 
            ? (experiences[editIndex].images || (experiences[editIndex].image ? [experiences[editIndex].image] : []))
            : [];
        saveData(existingImages);
    }

    function saveData(imageArray) {
        if (editIndex !== null) {
            experiences[editIndex] = {
                ...experiences[editIndex],
                title: title,
                category: category,
                date: date,
                detail: detail,
                images: imageArray
            };
            alert('อัปเดตประสบการณ์เรียบร้อย!');
        } else {
            const newExperience = {
                title: title,
                category: category,
                date: date,
                detail: detail,
                images: imageArray,
                author: currentUser.username,
                role: currentUser.role
            };
            experiences.push(newExperience);
        }

        localStorage.setItem('myExperiences', JSON.stringify(experiences));
        cancelEdit();
        renderExperiences();
    }
});

// 6. ฟังก์ชันลบรายการ
function deleteExperience(index) {
    if (confirm('คุณต้องการลบประสบการณ์นี้ใช่หรือไม่?')) {
        experiences.splice(index, 1);
        localStorage.setItem('myExperiences', JSON.stringify(experiences));
        if (editIndex === index) cancelEdit();
        renderExperiences();
    }
}

// เริ่มต้นโหลดหน้าเว็บ
updateAuthUI();