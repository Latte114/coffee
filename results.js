// results.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ใส่ Firebase config ของคุณ (ต้องเหมือนกันทุกไฟล์)
const firebaseConfig = {
  apiKey: "AIzaSyAa8YtOhh0IRHOxb0hJrAuEfbokabsPYqs",
  authDomain: "coffee-35446.firebaseapp.com",
  databaseURL: "https://coffee-35446-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "coffee-35446",
  storageBucket: "coffee-35446.firebasestorage.app",
  messagingSenderId: "1038338942121",
  appId: "1:1038338942121:web:29fa8f07cdff995f47b5b8",
  measurementId: "G-87PS6HD9N8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const roomId = new URLSearchParams(window.location.search).get("roomId");
const roomNameEl = document.getElementById("roomName");
const roomStatusEl = document.getElementById("roomStatus");
const votesTableBody = document.getElementById("votesTableBody"); // เปลี่ยนเป็น tbody ของตาราง
const noVotesMessage = document.getElementById("noVotesMessage"); // เพิ่มสำหรับข้อความเมื่อไม่มีโหวต
const backToHostBtn = document.getElementById("backToHostBtn");

// Object เพื่อเก็บ instance ของกราฟแต่ละตัว
const chartInstances = {};

// ฟังก์ชัน Debounce
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// กำหนดการทำงานของปุ่ม "กลับสู่ Dashboard"
backToHostBtn.onclick = () => {
    window.location.href = "host.html";
};

// ฟังก์ชันหลักสำหรับโหลดและแสดงผลลัพธ์
async function loadResults() {
    if (!roomId) {
        roomNameEl.textContent = "❌ ข้อผิดพลาด: ไม่พบรหัสห้อง";
        roomStatusEl.textContent = "";
        votesTableBody.innerHTML = ''; // เคลียร์ตาราง
        noVotesMessage.classList.remove('hidden'); // แสดงข้อความไม่มีโหวต
        noVotesMessage.textContent = 'กรุณาระบุรหัสห้องที่ถูกต้อง';
        clearAllCharts(); // Clear charts if there's no room
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบเพื่อดูผลลัพธ์");
            window.location.href = "index.html"; // เปลี่ยนเป็นหน้าล็อกอินของคุณ
            return;
        }

        const roomRef = ref(db, `rooms/${roomId}`);
        const debouncedRenderResults = debounce((snapshot) => {
            if (!snapshot.exists()) {
                roomNameEl.textContent = "❌ ข้อผิดพลาด: ไม่พบห้องนี้";
                roomStatusEl.textContent = "";
                votesTableBody.innerHTML = ''; // เคลียร์ตาราง
                noVotesMessage.classList.remove('hidden'); // แสดงข้อความไม่มีโหวต
                noVotesMessage.textContent = 'ห้องที่คุณค้นหาไม่มีอยู่แล้ว';
                clearAllCharts(); // Clear charts if room doesn't exist
                return;
            }

            const roomData = snapshot.val();
            roomNameEl.textContent = `📊 ผลการ Cupping: ${roomData.name}`;
            roomStatusEl.textContent = `สถานะ: ${roomData.status === 'open' ? '🟢 เปิด' : '🔴 ปิด'}`;

            const votes = roomData.votes || {};
            const voteCount = Object.keys(votes).length;

            if (voteCount === 0) {
                votesTableBody.innerHTML = ''; // เคลียร์ตาราง
                noVotesMessage.classList.remove('hidden'); // แสดงข้อความไม่มีโหวต
                noVotesMessage.textContent = 'ยังไม่มีข้อมูลการโหวตในห้องนี้';
                clearAllCharts(); // Clear charts if no votes
                return;
            }

            renderResults(votes);
        }, 500);

        onValue(roomRef, debouncedRenderResults);
    });
}

// Helper function to clear all chart instances
function clearAllCharts() {
    for (const canvasId in chartInstances) {
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
        }
        delete chartInstances[canvasId];
    }
}

// ฟังก์ชันสำหรับสร้างกราฟเรดาร์รวมทั้งหมด
function createOverallRadarChart(canvasId, avgData, max = 10, borderColor = 'rgba(75, 192, 192, 1)', backgroundColor = 'rgba(75, 192, 192, 0.2)') {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx) {
        console.warn(`Canvas element with ID '${canvasId}' not found or context not available.`);
        return;
    }

    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
        delete chartInstances[canvasId];
    }

    // ลำดับของ Labels ต้องตรงกับลำดับของ Data
    const labels = ['Sweetness', 'Acidity', 'Body', 'Aftertaste', 'Fragrance', 'Aroma', 'Flavor'];
    const data = [
        avgData.sweetness,
        avgData.acidity,
        avgData.body,
        avgData.aftertaste,
        avgData.fragrance,
        avgData.aroma,
        avgData.flavor
    ];

    const chart = new Chart(ctx, {
        type: 'radar', // กำหนดเป็นกราฟเรดาร์
        data: {
            labels: labels,
            datasets: [{
                label: 'คะแนนเฉลี่ยโดยรวม',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: borderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: { // กำหนด Scale สำหรับกราฟเรดาร์ (Radial Scale)
                    angleLines: {
                        display: true // แสดงเส้นแบ่งมุม
                    },
                    suggestedMin: 0, // ค่าต่ำสุด
                    max: max,       // ค่าสูงสุด (10 คะแนน)
                    ticks: {
                        stepSize: 1, // ช่วงห่างของ Tick
                        backdropColor: 'transparent', // ทำให้ตัวเลขบนแกนอ่านง่ายขึ้น
                        font: {
                            size: 12 // ขนาดตัวอักษรของ Tick
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 14 // ขนาดตัวอักษรของ Label แต่ละแกน
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // แสดง Legend (ชื่อชุดข้อมูล)
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw; // แสดง Label และค่าเมื่อ hover
                        }
                    }
                }
            }
        }
    });
    chartInstances[canvasId] = chart;
}

// ฟังก์ชันช่วยสรุป Descriptors สำหรับแสดงในช่องตาราง
function getVoteDescriptorsSummary(voteData, totalLimit = 3) {
    let allDescriptors = [];
    
    // ดึง Descriptors ทั้งหมดจากข้อมูลโหวตปัจจุบัน
    if (voteData.fragrance?.descriptors) allDescriptors = allDescriptors.concat(voteData.fragrance.descriptors);
    if (voteData.aroma?.descriptors) allDescriptors = allDescriptors.concat(voteData.aroma.descriptors);
    if (voteData.flavor?.descriptors) allDescriptors = allDescriptors.concat(voteData.flavor.descriptors);
    if (voteData.aftertaste?.descriptors) allDescriptors = allDescriptors.concat(voteData.aftertaste.descriptors);
    if (voteData.mainTastes) allDescriptors = allDescriptors.concat(voteData.mainTastes);
    if (voteData.mouthfeel?.descriptors) allDescriptors = allDescriptors.concat(voteData.mouthfeel.descriptors);

    const uniqueDescriptors = Array.from(new Set(allDescriptors)); // เอาเฉพาะค่าที่ไม่ซ้ำกัน
    
    if (uniqueDescriptors.length === 0) return 'N/A';
    
    const displayed = uniqueDescriptors.slice(0, totalLimit); // แสดงตามจำนวนที่จำกัด
    return displayed.join(', ') + (uniqueDescriptors.length > totalLimit ? '...' : ''); // เพิ่ม ... ถ้ามีรายการมากกว่าที่แสดง
}


// ฟังก์ชันสำหรับคำนวณค่าเฉลี่ยและแสดงกราฟ
function renderResults(votes) {
    const totalVotes = Object.keys(votes).length;
    
    // รวมคะแนนแต่ละด้าน
    const sum = {
        sweetness: 0, acidity: 0, body: 0, aftertaste: 0,
        fragrance: 0, aroma: 0, flavor: 0
    };
    
    // สำหรับเก็บ Descriptors ที่นิยมที่สุด (รวมจากทุกโหวต)
    const descriptorCounts = {
        fragrance: {}, aroma: {}, flavor: {}, aftertaste: {},
        mainTastes: {}, mouthfeel: {}
    };

    Object.values(votes).forEach(vote => {
        // คะแนน Intensity
        sum.sweetness += vote.sweetness?.intensity || 0;
        sum.acidity += vote.acidity?.intensity || 0;
        sum.body += vote.body?.intensity || 0;
        sum.aftertaste += vote.aftertaste?.intensity || 0;
        sum.fragrance += vote.fragrance?.intensity || 0;
        sum.aroma += vote.aroma?.intensity || 0;
        sum.flavor += vote.flavor?.intensity || 0;

        // นับ Descriptors (สำหรับ Top Descriptors รวม)
        vote.fragrance?.descriptors?.forEach(d => descriptorCounts.fragrance[d] = (descriptorCounts.fragrance[d] || 0) + 1);
        vote.aroma?.descriptors?.forEach(d => descriptorCounts.aroma[d] = (descriptorCounts.aroma[d] || 0) + 1);
        vote.flavor?.descriptors?.forEach(d => descriptorCounts.flavor[d] = (descriptorCounts.flavor[d] || 0) + 1);
        vote.aftertaste?.descriptors?.forEach(d => descriptorCounts.aftertaste[d] = (descriptorCounts.aftertaste[d] || 0) + 1);
        vote.mainTastes?.forEach(d => descriptorCounts.mainTastes[d] = (descriptorCounts.mainTastes[d] || 0) + 1);
        vote.mouthfeel?.descriptors?.forEach(d => descriptorCounts.mouthfeel[d] = (descriptorCounts.mouthfeel[d] || 0) + 1);
    });

    // คำนวณค่าเฉลี่ย
    const avg = {};
    for (const key in sum) {
        avg[key] = totalVotes > 0 ? parseFloat((sum[key] / totalVotes).toFixed(2)) : 0; // Ensure it's a number
    }

    // เรียกใช้ฟังก์ชันสร้างกราฟเรดาร์
    createOverallRadarChart('overallRadarChart', avg, 10, 'rgba(37, 99, 235, 1)', 'rgba(37, 99, 235, 0.4)');

    // Clear previous table content and manage "no votes" message
    votesTableBody.innerHTML = '';
    if (totalVotes === 0) {
        noVotesMessage.classList.remove('hidden');
        return;
    } else {
        noVotesMessage.classList.add('hidden');
    }

    // Populate the table for individual votes
    Object.entries(votes).forEach(([voterUID, voteData]) => {
        const row = votesTableBody.insertRow(); // สร้างแถวใหม่ในตาราง
        row.className = 'border-b border-gray-200 hover:bg-gray-50'; // เพิ่ม class สำหรับ styling

        // Voter Name
        const voterCell = row.insertCell();
        voterCell.className = 'py-2 px-3 text-blue-700 font-medium whitespace-nowrap';
        voterCell.textContent = voteData.voterName || 'ไม่ระบุชื่อ';

        // Sample No
        const sampleCell = row.insertCell();
        sampleCell.className = 'py-2 px-3 text-center';
        sampleCell.textContent = voteData.sampleNo || 'N/A';

        // Roast Level
        const roastCell = row.insertCell();
        roastCell.className = 'py-2 px-3 text-center';
        roastCell.textContent = voteData.roastLevel || 'N/A';

        // Scores (Sweetness, Acidity, Body, Aftertaste, Fragrance, Aroma, Flavor)
        const scoreKeys = ['sweetness', 'acidity', 'body', 'aftertaste', 'fragrance', 'aroma', 'flavor'];
        scoreKeys.forEach(key => {
            const cell = row.insertCell();
            cell.className = 'py-2 px-3 text-center';
            cell.textContent = voteData[key]?.intensity || 'N/A';
        });

        // Combined Descriptors for this vote
        const descriptorsCell = row.insertCell();
        descriptorsCell.className = 'py-2 px-3';
        descriptorsCell.textContent = getVoteDescriptorsSummary(voteData);

        // Timestamp
        const timestampCell = row.insertCell();
        timestampCell.className = 'py-2 px-3 text-gray-500 text-xs whitespace-nowrap';
        timestampCell.textContent = new Date(voteData.timestamp).toLocaleString();
    });

    // ฟังก์ชันช่วยหา Descriptor ที่พบบ่อยที่สุด (สำหรับ Summary Section)
    function getTopDescriptors(countsObj, limit = 5) {
        if (Object.keys(countsObj).length === 0) return 'N/A';
        
        const sorted = Object.entries(countsObj).sort(([,countA], [,countB]) => countB - countA);
        
        let html = '';
        const displayItems = sorted.slice(0, limit); // แสดง Top 'limit' รายการ

        if (displayItems.length === 0) {
            return 'N/A';
        }

        // สร้าง Nested List เพื่อแสดงผลให้เป็นระเบียบขึ้น
        html += '<ul class="list-disc ml-6 space-y-1 text-sm">'; // เพิ่ม margin-left และ space-y, ปรับขนาด font
        displayItems.forEach(([desc, count]) => {
            html += `<li class="text-gray-800">${desc} (${count} votes)</li>`; // เพิ่ม "votes" เพื่อความชัดเจน
        });
        html += '</ul>';

        if (sorted.length > limit) {
            html += `<p class="text-xs text-gray-500 mt-1 ml-6">(+ ${sorted.length - limit} more)</p>`; // แสดงจำนวนรายการที่เหลือ
        }
        
        return html;
    }

    // แสดง Descriptors ที่พบบ่อยที่สุดโดยรวม
    const summarySection = document.getElementById('summaryResults');
    // ลบส่วน Top Descriptors เก่าออกก่อน เพื่อไม่ให้ทับซ้อน
    const oldTopDescriptors = summarySection.querySelector('.top-descriptors-section');
    if (oldTopDescriptors) {
        oldTopDescriptors.remove();
    }

    let topDescriptorsHtml = `
        <div class="top-descriptors-section">
            <h3 class="text-xl font-semibold mb-2 mt-4">Top Descriptors</h3>
            <ul class="list-none text-gray-700"> <li><strong>**Fragrance:**</strong> ${getTopDescriptors(descriptorCounts.fragrance)}</li>
                <li><strong>**Aroma:**</strong> ${getTopDescriptors(descriptorCounts.aroma)}</li>
                <li><strong>**Flavor:**</strong> ${getTopDescriptors(descriptorCounts.flavor)}</li>
                <li><strong>**Aftertaste:**</strong> ${getTopDescriptors(descriptorCounts.aftertaste)}</li>
                <li><strong>**Main Tastes:**</strong> ${getTopDescriptors(descriptorCounts.mainTastes)}</li>
                <li><strong>**Mouthfeel:**</strong> ${getTopDescriptors(descriptorCounts.mouthfeel)}</li>
            </ul>
        </div>
    `;
    summarySection.insertAdjacentHTML('beforeend', topDescriptorsHtml);
}


// เริ่มโหลดผลลัพธ์เมื่อหน้าเว็บโหลดเสร็จ
loadResults();
