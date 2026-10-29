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

// ฟังก์ชันดึงโพสต์จาก Firebase Firestore มาแสดง
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

// ฟังก์ชันสร้าง Element การ์ดแต่ละอัน
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
        <span class="badge">${data.category || 'ประสบการณ์'}</span>
        <h3>${data.title}</h3>
        <p>${data.content}</p>
        ${imagesHTML}
        <div class="date">โพสต์เมื่อ: ${data.date || 'ไม่ระบุวันที่'}</div>
    `;

    return card;
}

// ฟังก์ชันบันทึกโพสต์ใหม่ลง Firebase
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
    
    // แปลงไฟล์รูปภาพเป็น Base64
    let images = [];
    if (imageInput && imageInput.files.length > 0) {
        for (let file of imageInput.files) {
            const base64 = await convertFileToBase64(file);
            images.push(base64);
        }
    }

    const newPost = {
        title: title,
        content: content,
        category: category,
        images: images,
        date: new Date().toLocaleDateString('th-TH'),
        timestamp: Date.now()
    };

    try {
        await window.fb.addDoc(window.fb.collection(window.db, "posts"), newPost);
        alert('บันทึกโพสต์ขึ้น Cloud เรียบร้อยแล้ว!');
        
        // ล้างฟอร์ม
        document.getElementById('postForm').reset();
        
        // โหลดรายการใหม่
        loadPostsFromCloud();
    } catch (error) {
        console.error("Error adding post: ", error);
        alert('เกิดข้อผิดพลาดในการบันทึกโพสต์');
    }
}

// แปลงไฟล์ภาพเป็น Base64 String
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
