// results.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, child, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const roomId = new URLSearchParams(window.location.search).get("roomId");
const roomNameEl = document.getElementById("roomName");
const roomStatusEl = document.getElementById("roomStatus");
const votesTableBody = document.getElementById("votesTableBody"); 
const noVotesMessage = document.getElementById("noVotesMessage"); 
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

// ฟังก์ชันสำหรับคำนวณค่าเฉลี่ย
function calculateAverages(votes) {
    if (votes.length === 0) return null;

    const attributes = ["sweetness", "acidity", "body", "aftertaste", "fragrance", "aroma", "flavor", "cleanCup", "overall", "balance", "uniformity"];
    const totals = {};

    attributes.forEach(attr => {
        totals[attr] = 0;
    });

    votes.forEach(vote => {
        attributes.forEach(attr => {
            // Check if the attribute exists and is a number, otherwise default to 0
            totals[attr] += (typeof vote[attr] === 'number' ? vote[attr] : 0);
        });
    });

    const averages = {};
    attributes.forEach(attr => {
        averages[attr] = totals[attr] / votes.length;
    });

    return averages;
}

// ฟังก์ชันสำหรับ Render กราฟ Radar
function renderOverallRadarChart(averages) {
    const ctx = document.getElementById("overallRadarChart");
    if (!ctx) return;

    // Destroy existing chart instance if it exists
    if (chartInstances["overallRadarChart"]) {
        chartInstances["overallRadarChart"].destroy();
    }

    const data = {
        labels: ["Sweetness", "Acidity", "Body", "Aftertaste", "Fragrance", "Aroma", "Flavor", "Clean Cup", "Overall", "Balance", "Uniformity"],
        datasets: [{
            label: "คะแนนเฉลี่ย",
            data: [
                averages.sweetness,
                averages.acidity,
                averages.body,
                averages.aftertaste,
                averages.fragrance,
                averages.aroma,
                averages.flavor,
                averages.cleanCup,
                averages.overall,
                averages.balance,
                averages.uniformity,
            ],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(54, 162, 235)'
        }]
    };

    const config = {
        type: 'radar',
        data: data,
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 15, // คะแนนสูงสุดที่ใช้ใน room.html
                    pointLabels: {
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        stepSize: 5
                    }
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'ภาพรวมคะแนน Cupping'
                }
            }
        },
    };

    chartInstances["overallRadarChart"] = new Chart(ctx, config);
}

// ฟังก์ชันสำหรับแสดงผลลัพธ์รวม
function renderOverallAverages(allVotes) {
    const averages = calculateAverages(allVotes);
    if (!averages) {
        document.getElementById("overallAverages").innerHTML = "<p class='text-gray-500'>ยังไม่มีคะแนน</p>";
        return;
    }

    // แสดงผลรวมคะแนน
    const totalScore = (
        averages.sweetness + averages.acidity + averages.body + averages.aftertaste +
        averages.fragrance + averages.aroma + averages.flavor +
        averages.cleanCup + averages.overall + averages.balance + averages.uniformity
    );

    const attributesToDisplay = [
        { label: "Sweetness", value: averages.sweetness },
        { label: "Acidity", value: averages.acidity },
        { label: "Body", value: averages.body },
        { label: "Aftertaste", value: averages.aftertaste },
        { label: "Fragrance", value: averages.fragrance },
        { label: "Aroma", value: averages.aroma },
        { label: "Flavor", value: averages.flavor },
        { label: "Clean Cup", value: averages.cleanCup },
        { label: "Overall", value: averages.overall },
        { label: "Balance", value: averages.balance },
        { label: "Uniformity", value: averages.uniformity }
    ];

    let html = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="overallAverages">
            <div class="bg-gray-100 p-4 rounded-lg shadow-inner text-center">
                <p class="text-4xl font-bold text-blue-600">${(totalScore).toFixed(2)}</p>
                <p class="text-sm text-gray-500">คะแนนรวมเฉลี่ย</p>
            </div>
    `;

    attributesToDisplay.forEach(item => {
        html += `
            <div class="bg-gray-100 p-4 rounded-lg shadow-inner text-center">
                <p class="text-2xl font-bold text-gray-800">${item.value.toFixed(2)}</p>
                <p class="text-xs text-gray-500">${item.label}</p>
            </div>
        `;
    });

    html += `</div>`;
    
    // Update the DOM element
    const overallAveragesEl = document.getElementById("overallAveragesContainer");
    if (overallAveragesEl) {
        overallAveragesEl.innerHTML = html;
    }

    renderOverallRadarChart(averages);
}

// ฟังก์ชันสำหรับคำนวณและแสดงผลลัพธ์รายตัวอย่าง
function renderSampleAverages(votesBySample) {
    const container = document.getElementById("sampleResultsContainer");
    if (!container) {
        // สร้าง container ถ้ายังไม่มี
        const newContainer = document.createElement("div");
        newContainer.id = "sampleResultsContainer";
        document.getElementById("summaryResults").insertAdjacentElement('afterend', newContainer);
    }
    
    // ลบเนื้อหาเก่าออกก่อน
    container.innerHTML = '';
    const sampleNumbers = Object.keys(votesBySample).sort((a, b) => parseInt(a) - parseInt(b));

    sampleNumbers.forEach(sampleNo => {
        const votes = votesBySample[sampleNo];
        const averages = calculateAverages(votes);
        const totalScore = averages ? (
            averages.sweetness + averages.acidity + averages.body + averages.aftertaste +
            averages.fragrance + averages.aroma + averages.flavor +
            averages.cleanCup + averages.overall + averages.balance + averages.uniformity
        ) : 0;
        
        const sampleCard = document.createElement("div");
        sampleCard.className = "bg-white p-6 rounded-lg shadow-md mb-6 border-l-4 border-blue-500";
        sampleCard.innerHTML = `
            <h3 class="text-2xl font-bold mb-4 text-blue-700">Sample #${sampleNo}</h3>
            <p class="text-lg font-semibold text-gray-800 mb-2">คะแนนรวมเฉลี่ย: ${totalScore.toFixed(2)} (${votes.length} Votes)</p>
            <canvas id="sampleChart${sampleNo}" width="400" height="400"></canvas>
        `;
        container.appendChild(sampleCard);

        if (averages) {
            renderSampleRadarChart(sampleNo, averages);
        }
    });
}

// ฟังก์ชันสำหรับ Render กราฟ Radar ของแต่ละตัวอย่าง
function renderSampleRadarChart(sampleNo, averages) {
    const ctx = document.getElementById(`sampleChart${sampleNo}`);
    if (!ctx) return;

    // Attributes for the radar chart
    const labels = ["Sweetness", "Acidity", "Body", "Aftertaste", "Fragrance", "Aroma", "Flavor", "Clean Cup", "Overall", "Balance", "Uniformity"];
    const dataPoints = [
        averages.sweetness,
        averages.acidity,
        averages.body,
        averages.aftertaste,
        averages.fragrance,
        averages.aroma,
        averages.flavor,
        averages.cleanCup,
        averages.overall,
        averages.balance,
        averages.uniformity,
    ];

    const data = {
        labels: labels,
        datasets: [{
            label: `Sample #${sampleNo} Average Score`,
            data: dataPoints,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgb(75, 192, 192)',
            pointBackgroundColor: 'rgb(75, 192, 192)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgb(75, 192, 192)'
        }]
    };

    const config = {
        type: 'radar',
        data: data,
        options: {
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 15, 
                    ticks: {
                        stepSize: 5
                    }
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: `Sample #${sampleNo} Results`
                }
            }
        },
    };

    // Store the chart instance
    if (chartInstances[`sampleChart${sampleNo}`]) {
        chartInstances[`sampleChart${sampleNo}`].destroy();
    }
    chartInstances[`sampleChart${sampleNo}`] = new Chart(ctx, config);
}

// ฟังก์ชันสำหรับลบกราฟทั้งหมด
function clearAllCharts() {
    for (const key in chartInstances) {
        if (chartInstances[key]) {
            chartInstances[key].destroy();
        }
    }
}

// ฟังก์ชันสำหรับคำนวณและแสดง Descriptors ที่พบบ่อยที่สุด
function calculateAndDisplayTopDescriptors(allVotes) {
    const descriptorCounts = {
        fragrance: {},
        aroma: {},
        flavor: {},
        aftertaste: {},
        mainTastes: {},
        mouthfeel: {},
    };

    allVotes.forEach(vote => {
        // วนลูปผ่านประเภท descriptor
        for (const key in descriptorCounts) {
            const category = key.charAt(0).toUpperCase() + key.slice(1); // เช่น 'Fragrance', 'Aroma'
            const descriptorKey = `${category}Descriptors`; // ชื่อ field ใน Firebase เช่น 'FragranceDescriptors'
            
            if (vote[descriptorKey] && Array.isArray(vote[descriptorKey])) {
                vote[descriptorKey].forEach(descriptor => {
                    const normalizedDescriptor = descriptor.trim();
                    descriptorCounts[key][normalizedDescriptor] = (descriptorCounts[key][normalizedDescriptor] || 0) + 1;
                });
            }
        }
    });

    // ฟังก์ชันช่วยในการจัดเรียงและเลือก Top 3 Descriptors
    function getTopDescriptors(counts, limit = 3) {
        const sorted = Object.entries(counts)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([descriptor, count]) => `${descriptor} (${count})`);

        if (sorted.length === 0) {
            return "ไม่มีข้อมูล";
        }
        
        let html = sorted.slice(0, limit).join(', ');
        
        // ถ้ามีรายการมากกว่า limit ให้แสดงจำนวนที่เหลือ
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

// ฟังก์ชันหลักสำหรับโหลดและแสดงผลลัพธ์
async function loadResults() {
    if (!roomId) {
        roomNameEl.textContent = "❌ ข้อผิดพลาด: ไม่พบรหัสห้อง";
        roomStatusEl.textContent = "";
        votesTableBody.innerHTML = ''; 
        noVotesMessage.classList.remove('hidden'); 
        noVotesMessage.textContent = 'กรุณาระบุรหัสห้องที่ถูกต้อง';
        clearAllCharts(); 
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            alert("กรุณาเข้าสู่ระบบเพื่อดูผลลัพธ์");
            window.location.href = "index.html"; 
            return;
        }

        const roomRef = ref(db, `rooms/${roomId}`);
        const debouncedRenderResults = debounce((snapshot) => {
            if (!snapshot.exists()) {
                roomNameEl.textContent = "❌ ข้อผิดพลาด: ไม่พบห้องนี้";
                roomStatusEl.textContent = "ห้องนี้อาจถูกลบไปแล้ว";
                votesTableBody.innerHTML = '';
                noVotesMessage.classList.remove('hidden');
                noVotesMessage.textContent = 'ไม่พบห้องที่ระบุ กรุณาตรวจสอบรหัสห้องอีกครั้ง';
                clearAllCharts();
                return;
            }

            const roomData = snapshot.val();
            roomNameEl.textContent = `Cupping Results: ${roomData.name}`;
            const statusText = roomData.status === "open" ? "เปิดอยู่ (กำลังรับคะแนน)" : "ปิดแล้ว";
            roomStatusEl.textContent = `สถานะ: ${statusText}`;

            // โหลดข้อมูลคะแนนโหวตจากห้องนี้
            const votesRef = child(roomRef, 'votes');
            onValue(votesRef, (votesSnapshot) => {
                const votesData = votesSnapshot.val();
                votesTableBody.innerHTML = ''; // เคลียร์ตาราง
                
                if (!votesData) {
                    noVotesMessage.classList.remove('hidden');
                    votesTableBody.innerHTML = '';
                    clearAllCharts(); // Clear charts if no votes
                    return;
                }

                noVotesMessage.classList.add('hidden'); // ซ่อนข้อความเมื่อมีข้อมูล
                
                const allVotes = Object.keys(votesData).map(key => ({ id: key, ...votesData[key] }));

                // จัดกลุ่มคะแนนตาม Sample Number
                const votesBySample = allVotes.reduce((acc, vote) => {
                    const sampleNo = vote.sampleNumber;
                    if (!acc[sampleNo]) {
                        acc[sampleNo] = [];
                    }
                    acc[sampleNo].push(vote);
                    return acc;
                }, {});

                // แสดงผลคะแนนทั้งหมดในตาราง
                allVotes.forEach(vote => {
                    const row = createTableRow(vote);
                    votesTableBody.appendChild(row);
                });

                // แสดงสรุปผลลัพธ์รวม
                renderOverallAverages(allVotes);
                // แสดงผลลัพธ์รายตัวอย่าง
                renderSampleAverages(votesBySample);
                // แสดง Descriptors ที่พบบ่อยที่สุด
                calculateAndDisplayTopDescriptors(allVotes);
            });
        }, 300); // 300ms debounce time

        onValue(roomRef, debouncedRenderResults);
    });
}

function createTableRow(vote) {
    const row = document.createElement("tr");
    row.className = "bg-white border-b hover:bg-gray-50";

    // Format timestamp
    const timestamp = new Date(vote.timestamp);
    const formattedDate = timestamp.toLocaleString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });

    // Helper function to render descriptors
    const renderDescriptors = (descriptors) => {
        if (!descriptors || descriptors.length === 0) return "-";
        return descriptors.join(', ');
    };

    // Calculate total score for the row
    const scoreAttributes = ["sweetness", "acidity", "body", "aftertaste", "fragrance", "aroma", "flavor", "cleanCup", "overall", "balance", "uniformity"];
    const totalScore = scoreAttributes.reduce((sum, attr) => sum + (vote[attr] || 0), 0);

    // Create table cells (td)
    row.innerHTML = `
        <td class="py-2 px-3 text-gray-900 font-semibold">${vote.voterName || vote.voterEmail}</td>
        <td class="py-2 px-3 text-center">${vote.sampleNumber || '-'}</td>
        <td class="py-2 px-3">${vote.roastLevel || '-'}</td>
        <td class="py-2 px-3 text-center">${(vote.sweetness || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.acidity || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.body || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.aftertaste || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.fragrance || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.aroma || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.flavor || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.cleanCup || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.overall || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.balance || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center">${(vote.uniformity || 0).toFixed(1)}</td>
        <td class="py-2 px-3 text-center font-bold text-blue-700">${totalScore.toFixed(2)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.FragranceDescriptors)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.AromaDescriptors)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.FlavorDescriptors)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.AftertasteDescriptors)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.MainTastesDescriptors)}</td>
        <td class="py-2 px-3">${renderDescriptors(vote.MouthfeelDescriptors)}</td>
        <td class="py-2 px-3 text-sm text-gray-500">${formattedDate}</td>
    `;
    return row;
}

// เริ่มโหลดข้อมูลเมื่อ DOM โหลดเสร็จ
document.addEventListener("DOMContentLoaded", loadResults);