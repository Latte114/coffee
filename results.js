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
if (backToHostBtn) {
    backToHostBtn.onclick = () => {
        window.location.href = "host.html";
    };
}

// ฟังก์ชันสำหรับ Render Descriptors (ใช้สำหรับ Fragrance, Aroma, Flavor, Acidity, Aftertaste)
function renderDescriptors(descriptors) {
    if (!descriptors || descriptors.length === 0) {
        return '-';
    }
    return descriptors.map(d => `<span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">${d}</span>`).join('');
}

// ฟังก์ชันสำหรับทำลายกราฟ Chart.js ที่มีอยู่
function destroyCharts() {
    for (const chartId in chartInstances) {
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            delete chartInstances[chartId];
        }
    }
}

// ฟังก์ชันโหลดข้อมูลและแสดงผล
function loadResults(user) {
    if (!roomId) {
        roomNameEl.textContent = "Error: No Room ID provided";
        noVotesMessage.classList.remove("hidden");
        return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    const votesRef = ref(db, `rooms/${roomId}/votes`);
    const samplesRef = ref(db, `rooms/${roomId}/samples`);

    // 1. โหลดข้อมูลห้อง (ชื่อและสถานะ)
    onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
            const room = snapshot.val();
            roomNameEl.textContent = `Cupping Results: ${room.name}`;
            roomStatusEl.textContent = `สถานะ: ${room.status === 'open' ? 'เปิดรับคะแนน' : 'ปิดรับคะแนน'}`;
        } else {
            roomNameEl.textContent = "Room Not Found";
            roomStatusEl.textContent = "";
            noVotesMessage.classList.remove("hidden");
        }
    });

    let currentSamples = {}; // เก็บข้อมูลตัวอย่าง

    // 2. โหลดข้อมูลตัวอย่าง
    onValue(samplesRef, (snapshot) => {
        currentSamples = {}; // Reset samples
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const sample = childSnapshot.val();
                currentSamples[sample.number] = sample.description || `Sample ${sample.number}`;
            });
        }
        // เมื่อโหลดตัวอย่างเสร็จแล้ว ให้โหลดคะแนน (เพื่อให้แน่ใจว่ามีข้อมูลตัวอย่างสำหรับกราฟ)
        fetchVotesAndRenderCharts(currentSamples);
    });

    // 3. โหลดและแสดงคะแนนโหวตทั้งหมด
    // onValue(votesRef, (snapshot) => { // นี่คือการฟังแบบ Real-time
    //     displayIndividualVotes(snapshot);
    // });
    // ใช้ get แทน onValue ที่นี่ เพื่อดึงข้อมูลครั้งเดียว ไม่ต้อง Real-time update ตารางทั้งหมด
    // ถ้าต้องการ Real-time update ตาราง ควรใช้ onValue และจัดการประสิทธิภาพให้ดี
    // สำหรับหน้าผลลัพธ์ การดึงครั้งเดียวเมื่อโหลดหน้าอาจเพียงพอ หากไม่ได้คาดหวังการเปลี่ยนแปลงคะแนนแบบ Real-time บ่อยๆ
    // อย่างไรก็ตาม ถ้าใช้ onValue จะต้องทำลาย Chart Instances และสร้างใหม่ทุกครั้งที่ข้อมูลเปลี่ยน ซึ่งมีผลต่อประสิทธิภาพ

    // ใช้ onValue สำหรับ votesRef เพื่อให้ข้อมูลคะแนน Real-time
    const debouncedDisplayVotesAndCharts = debounce((votesSnapshot, samplesData) => {
        destroyCharts(); // ทำลายกราฟเก่าก่อนสร้างใหม่
        displayIndividualVotes(votesSnapshot, samplesData);
        if (votesSnapshot.exists()) {
            calculateAndRenderOverallAverages(votesSnapshot, samplesData);
            renderSampleComparisonCharts(votesSnapshot, samplesData);
        } else {
            document.getElementById("overallRadarChartContainer").classList.add("hidden");
            document.getElementById("sampleComparisonCharts").innerHTML = '';
            document.getElementById("noVotesMessage").classList.remove("hidden");
        }
    }, 300); // Debounce เพื่อประสิทธิภาพ

    onValue(votesRef, (snapshot) => {
        debouncedDisplayVotesAndCharts(snapshot, currentSamples);
    });
}

// 4. แสดงคะแนนโหวตรายบุคคลในตาราง
function displayIndividualVotes(votesSnapshot, samplesData) {
    votesTableBody.innerHTML = "";
    if (votesSnapshot.exists()) {
        noVotesMessage.classList.add("hidden");
        votesSnapshot.forEach((childSnapshot) => {
            const vote = childSnapshot.val();
            const voterName = vote.voterName || "Unknown Voter";
            const sampleDescription = samplesData[vote.sampleNumber] || `Sample ${vote.sampleNumber}`;
            
            // คำนวณคะแนนรวม
            const totalScore = (vote.sweetness || 0) + (vote.acidity || 0) + (vote.body || 0) +
                             (vote.aftertaste || 0) + (vote.fragrance || 0) + (vote.aroma || 0) +
                             (vote.flavor || 0) + (vote.cleanCup || 0) + (vote.overall || 0) +
                             (vote.balance || 0) + (vote.uniformity || 0);

            const row = votesTableBody.insertRow();
            row.className = "hover:bg-gray-50"; // Add hover effect
            row.innerHTML = `
                <td class="py-2 px-3 whitespace-nowrap font-medium text-gray-900">${voterName}</td>
                <td class="py-2 px-3 whitespace-nowrap text-gray-700">${sampleDescription}</td>
                <td class="py-2 px-3 text-center text-gray-700">${vote.roastLevel || '-'}</td>
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
                <td class="py-2 px-3">${renderDescriptors(vote.AcidityDescriptors)}</td>
                <td class="py-2 px-3">${renderDescriptors(vote.AftertasteDescriptors)}</td>
            `;
        });
    } else {
        noVotesMessage.classList.remove("hidden");
    }
}

// 5. คำนวณและแสดงค่าเฉลี่ยรวม (Overall Radar Chart)
function calculateAndRenderOverallAverages(votesSnapshot, samplesData) {
    const categories = [
        "sweetness", "acidity", "body", "aftertaste", "fragrance",
        "aroma", "flavor", "cleanCup", "overall", "balance", "uniformity"
    ];
    
    // Group votes by sample number
    const votesBySample = {};
    votesSnapshot.forEach(childSnapshot => {
        const vote = childSnapshot.val();
        if (!votesBySample[vote.sampleNumber]) {
            votesBySample[vote.sampleNumber] = [];
        }
        votesBySample[vote.sampleNumber].push(vote);
    });

    const datasets = [];
    const colors = [
        'rgba(255, 99, 132, 0.7)', // Red
        'rgba(54, 162, 235, 0.7)', // Blue
        'rgba(255, 206, 86, 0.7)', // Yellow
        'rgba(75, 192, 192, 0.7)', // Green
        'rgba(153, 102, 255, 0.7)',// Purple
        'rgba(255, 159, 64, 0.7)', // Orange
    ];
    let colorIndex = 0;

    for (const sampleNumber in votesBySample) {
        const sampleVotes = votesBySample[sampleNumber];
        const averages = {};
        categories.forEach(cat => {
            const sum = sampleVotes.reduce((acc, vote) => acc + (vote[cat] || 0), 0);
            averages[cat] = sum / sampleVotes.length;
        });

        const data = categories.map(cat => averages[cat].toFixed(1));
        const sampleDescription = samplesData[sampleNumber] || `Sample ${sampleNumber}`;
        const color = colors[colorIndex % colors.length];

        datasets.push({
            label: sampleDescription,
            data: data,
            backgroundColor: color.replace('0.7', '0.2'), // Lighter fill
            borderColor: color,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color,
            borderWidth: 2,
            fill: true
        });
        colorIndex++;
    }

    const ctx = document.getElementById('overallRadarChart').getContext('2d');
    
    if (chartInstances.overallRadarChart) {
        chartInstances.overallRadarChart.destroy(); // ทำลาย instance เก่าถ้ามี
    }

    chartInstances.overallRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1')), // Capitalize and add spaces
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: false
                    },
                    suggestedMin: 0,
                    suggestedMax: 10, // Assuming score is 0-10
                    pointLabels: {
                        font: {
                            size: 14
                        }
                    },
                    ticks: {
                        beginAtZero: true,
                        stepSize: 1,
                        maxTicksLimit: 11
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'คะแนนเฉลี่ยรวมของตัวอย่าง'
                }
            }
        }
    });
    document.getElementById("overallRadarChartContainer").classList.remove("hidden");
}

// 6. แสดงกราฟเปรียบเทียบแต่ละตัวอย่าง
function renderSampleComparisonCharts(votesSnapshot, samplesData) {
    const sampleComparisonChartsContainer = document.getElementById("sampleComparisonCharts");
    sampleComparisonChartsContainer.innerHTML = ""; // Clear existing charts

    const categories = [
        "sweetness", "acidity", "body", "aftertaste", "fragrance",
        "aroma", "flavor", "cleanCup", "overall", "balance", "uniformity"
    ];

    const votesBySample = {};
    votesSnapshot.forEach(childSnapshot => {
        const vote = childSnapshot.val();
        if (!votesBySample[vote.sampleNumber]) {
            votesBySample[vote.sampleNumber] = [];
        }
        votesBySample[vote.sampleNumber].push(vote);
    });

    for (const sampleNumber in votesBySample) {
        const sampleVotes = votesBySample[sampleNumber];
        const sampleDescription = samplesData[sampleNumber] || `Sample ${sampleNumber}`;

        const averages = {};
        categories.forEach(cat => {
            const sum = sampleVotes.reduce((acc, vote) => acc + (vote[cat] || 0), 0);
            averages[cat] = sum / sampleVotes.length;
        });

        // Create a new div for each chart
        const chartDiv = document.createElement('div');
        chartDiv.className = 'bg-white p-4 rounded-lg shadow-md';
        chartDiv.innerHTML = `
            <h3 class="text-xl font-semibold text-center mb-4">${sampleDescription}</h3>
            <canvas id="sampleRadarChart-${sampleNumber}"></canvas>
        `;
        sampleComparisonChartsContainer.appendChild(chartDiv);

        const ctx = document.getElementById(`sampleRadarChart-${sampleNumber}`).getContext('2d');
        
        if (chartInstances[`sampleRadarChart-${sampleNumber}`]) {
            chartInstances[`sampleRadarChart-${sampleNumber}`].destroy();
        }

        chartInstances[`sampleRadarChart-${sampleNumber}`] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1).replace(/([A-Z])/g, ' $1')),
                datasets: [{
                    label: 'คะแนนเฉลี่ย',
                    data: categories.map(cat => averages[cat].toFixed(1)),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 10,
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        },
                        ticks: {
                            beginAtZero: true,
                            stepSize: 1,
                            maxTicksLimit: 11
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    title: {
                        display: false, // Title is in h3
                    }
                }
            }
        });
    }
}

// Helper function to fetch votes and samples data together for rendering charts
function fetchVotesAndRenderCharts(samplesData) {
    const votesRef = ref(db, `rooms/${roomId}/votes`);
    get(votesRef).then(votesSnapshot => {
        // This is called from onValue(samplesRef), so samplesData is already available
        displayIndividualVotes(votesSnapshot, samplesData);
        if (votesSnapshot.exists()) {
            document.getElementById("overallRadarChartContainer").classList.remove("hidden");
            document.getElementById("noVotesMessage").classList.add("hidden");
            calculateAndRenderOverallAverages(votesSnapshot, samplesData);
            renderSampleComparisonCharts(votesSnapshot, samplesData);
        } else {
            document.getElementById("overallRadarChartContainer").classList.add("hidden");
            document.getElementById("sampleComparisonCharts").innerHTML = '';
            document.getElementById("noVotesMessage").classList.remove("hidden");
        }
    }).catch(error => {
        console.error("Error fetching votes for chart rendering:", error);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูลคะแนนโหวต");
        document.getElementById("noVotesMessage").classList.remove("hidden");
    });
}


// ตรวจสอบสถานะการล็อกอิน
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadResults(user);
    } else {
        alert("กรุณาเข้าสู่ระบบเพื่อดูผลลัพธ์");
        window.location.href = "index.html";
    }
});