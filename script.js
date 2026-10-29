let editingPostId = null; // ตัวแปรเก็บ ID โพสต์ที่กำลังแก้ไข

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadPostsFromCloud();
    }, 500);

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

// ฟังก์ชันสร้าง Element การ์ด (เพิ่มปุ่มแก้ไข และ ปุ่มลบ)
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

// ฟังก์ชันสำหรับป้องกันปัญหาข้อความที่มีเครื่องหมายอัญประกาศ
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
            // กรณีเป็นโหมดแก้ไขโพสต์เดิม
            const postRef = window.fb.doc(window.db, "posts", editingPostId);
            const updateData = {
                title: title,
                content: content,
                category: category
            };
            
            // ถ้ามีการเลือกรูปใหม่ ให้แก้รูปด้วย
            if (images.length > 0) {
                updateData.images = images;
            }

            await window.fb.updateDoc(postRef, updateData);
            alert('อัปเดตโพสต์เรียบร้อยแล้ว!');
            resetFormState();
        } else {
            // กรณีเป็นโหมดสร้างโพสต์ใหม่
            const newPost = {
                title: title,
                content: content,
                category: category,
                images: images,
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
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// ดึงข้อมูลโพสต์ขึ้นไปใส่ฟอร์มเพื่อเตรียมแก้ไข
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

    // เลื่อนหน้าจอขึ้นไปที่ฟอร์ม
    document.getElementById('postForm').scrollIntoView({ behavior: 'smooth' });
}

// ล้างสถานะฟอร์มกลับเป็นโหมดสร้างใหม่
function resetFormState() {
    editingPostId = null;
    document.getElementById('postForm').reset();
    const submitBtn = document.querySelector('#postForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = 'เผยแพร่โพสต์';
        submitBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
    }
}

// ฟังก์ชันลบโพสต์ออกจาก Cloud
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

// แปลงไฟล์รูปภาพเป็น Base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(resolve.result);
        reader.onerror = error => reject(error);
    });
}
