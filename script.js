let editingPostId = null; // ตัวแปรเก็บ ID โพสต์ที่กำลังแก้ไข

document.addEventListener('DOMContentLoaded', () => {
    // โหลดข้อมูลบทความจาก Cloud เมื่อเปิดหน้าเว็บ
    setTimeout(() => {
        loadPostsFromCloud();
    }, 500);

    // ดักจับการกดปุ่มส่งฟอร์ม
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handlePostSubmit);
    }
});

// ฟังก์ชันดึงโพสต์ทั้งหมดจาก Cloud
async function loadPostsFromCloud() {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer) return;
    
    cardContainer.innerHTML = '<p style="text-align:center; color:#78716c;">กำลังโหลดข้อมูล...</p>';

    try {
        if (!window.fb || !window.db) {
            console.error("Firebase is not initialized");
            return;
        }

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

// ฟังก์ชันสร้าง Element การ์ดแต่ละอัน (พร้อมปุ่มแก้ไข และ ปุ่มลบ)
function createCardElement(id, data) {
    const card = document.createElement('div');
    card.className = 'card';

    let imagesHTML = '';
    if (data.images && data.images.length > 0) {
        imagesHTML = `<div class="image-gallery">` + 
            data.images.map(img => `<img src="${img}" alt="รูปภาพ">`).join('') + 
            `</div>`;
    }

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge">${data.category || 'ทั่วไป'}</span>
            <div class="card-actions" style="display: flex; gap: 8px;">
                <button onclick="prepareEditPost('${id}', \`${escapeQuotes(data.title)}\`, \`${escapeQuotes(data.content)}\`, '${data.category}')" 
                        style="background: #f59e0b; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">แก้ไข</button>
                <button onclick="deletePost('${id}')" 
                        style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">ลบ</button>
            </div>
        </div>
        <h3>${data.title}</h3>
        <p>${data.content}</p>
        ${imagesHTML}
        <div class="date">โพสต์เมื่อ: ${data.date || 'ไม่ระบุวันที่'}</div>
    `;

    return card;
}

// ฟังก์ชันป้องกันปัญหาข้อความที่มีเครื่องหมายอัญประกาศ
function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

// ฟังก์ชันบันทึกโพสต์ (รองรับทั้ง เพิ่มใหม่ และ แก้ไข)
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
            // กรณีโหมดแก้ไขโพสต์เดิม
            const postRef = window.fb.doc(window.db, "posts", editingPostId);
            const updateData = {
                title: title,
