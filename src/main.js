document.getElementById('addEntryBtn').addEventListener('click', addEntry);
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
document.getElementById('calculateEntryTimeBtn').addEventListener('click', calculateEntryTime);
document.getElementById('openFileBtn').addEventListener('click', openFile);
document.getElementById('saveToCSVBtn').addEventListener('click', saveTableToCSV);

async function openFile() {
    try {
        const path = await window.__TAURI__.dialog.open({ multiple: false, directory: false });
        if (path) {
            const response = await window.__TAURI__.invoke('open_file', { path });
            console.log(response);
        }
    } catch (error) {
        console.error('Error opening file:', error);
    }
}
async function saveTableToCSV() {
    console.log("savebtn called");
    const table = document.getElementById('truckSchedule');
    let data = [];

    // Skip the header row and prepare data
    for (let i = 1, row; row = table.rows[i]; i++) {
        let rowData = [];
        for (let j = 0, col; col = row.cells[j]; j++) {
            rowData.push(col.innerText);
        }
        data.push(rowData.join(","));
    }

    try {
        // Open save file dialog
        const filePath = await window.__TAURI__.dialog.save({
            defaultPath: 'truck_schedule.csv',
            filters: [{ name: 'CSV', extensions: ['csv'] }]
        });

        if (filePath) {
            // Send data to Rust backend for CSV creation
            await window.__TAURI__.invoke('save_to_csv', { data, file_path: filePath });
            console.log('CSV file saved successfully');
        }
    } catch (error) {
        console.error('Error saving CSV file:', error);
    }
}


async function calculateEntryTime() {
    const destinationName = document.getElementById('destinationName').value;
    const distanceFromEntry = parseInt(document.getElementById('distanceFromEntry').value, 10);
    const trucksPerDay = parseInt(document.getElementById('trucksPerDay').value, 10);
    const parkingDuration = parseInt(document.getElementById('parkingDuration').value, 10);

    try {
        const entryTime = await window.__TAURI__.invoke('calculate_entry_time', { distanceFromEntry, trucksPerDay, parkingDuration });
        console.log('Calculated Entry Time:', entryTime);
        // Add logic to display or use the calculated entry time
    } catch (error) {
        console.error('Error calculating entry time:', error);
    }
}

async function addEntry() {
    const destinationName = document.getElementById('destinationName').value;
    const distanceFromEntry = parseInt(document.getElementById('distanceFromEntry').value, 10);
    const trucksPerDay = parseInt(document.getElementById('trucksPerDay').value, 10);
    const parkingDuration = parseInt(document.getElementById('parkingDuration').value, 10);
    const availableParkingSpots = parseInt(document.getElementById('availableParkingSpots').value, 10);

    try {
        const entryTimes = await window.__TAURI__.invoke('calculate_entry_time', { distanceFromEntry, trucksPerDay, parkingDuration, availableParkingSpots });
        entryTimes.forEach((entryTimeData, index) => {
            addToTable(destinationName, entryTimeData, index + 1);
        });
    } catch (error) {
        console.error('Error calculating entry time:', error);
    }
}

function addToTable(destinationName, entryTimeData, truckNumber) {
    const table = document.getElementById('truckSchedule').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const idCell = newRow.insertCell(0);
    const entryTimeCell = newRow.insertCell(1);
    const convertedTimeCell = newRow.insertCell(2); // New cell for converted time
    const selectCell = newRow.insertCell(3);

    const id = destinationName.match(/[A-Z]/g).join('') + "_" + truckNumber;
    idCell.textContent = id;

    // Assuming entryTimeData is an array [entryTimeInSeconds, entryTimeIn24HrFormat]
    entryTimeCell.textContent = entryTimeData[0]; // Original time in seconds
    convertedTimeCell.textContent = entryTimeData[1]; // Converted time

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    selectCell.appendChild(checkbox);

    newRow.style.backgroundColor = getColorForId(id);
}

function getColorForId(id) {
    const idPrefix = id.split('_')[0];
    return generatePastelColor(idPrefix);
}

function generatePastelColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + (value + 100).toString(16)).substr(-2);
    }
    return color;
}

function deleteSelected() {
    const table = document.getElementById('truckSchedule').getElementsByTagName('tbody')[0];
    Array.from(table.rows).forEach(row => {
        if (row.cells[3].getElementsByTagName('input')[0].checked) {
            table.deleteRow(row.rowIndex - 1);
        }
    });
}
