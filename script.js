// ฟังก์ชันสร้าง Element การ์ด (แสดงปุ่ม แก้ไข/ลบ เฉพาะเมื่อเป็น Admin)
function createCardElement(id, data) {
    const card = document.createElement('div');
    card.className = 'card';

    // ตรวจสอบว่ามี parameter ?admin=true บน URL หรือไม่
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';

    let actionButtons = '';
    if (isAdmin) {
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
