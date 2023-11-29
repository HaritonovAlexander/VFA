
document.getElementById('addEntryBtn').addEventListener('click', addEntry);
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
document.getElementById('calculateEntryTimeBtn').addEventListener('click', calculateEntyTime);
document.getElementById('openFileBtn').addEventListener('click', openFile);
document.getElementById('saveToSQLiteBtn').addEventListener('click', saveToSQLite);
document.getElementById('saveToCSVBtn').addEventListener('click', saveToCSV);

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

async function saveToSQLite() {
    const data = 'Sample data'; // Replace with actual data
    try {
        await window.__TAURI__.invoke('save_to_sqlite', { data });
        console.log('Data saved to SQLite');
    } catch (error) {
        console.error('Error saving to SQLite:', error);
    }
}

async function saveToCSV() {
    const data = ['Sample data']; // Replace with actual data array
    const filePath = '/path/to/save.csv'; // Replace with actual file path
    try {
        await window.__TAURI__.invoke('save_to_csv', { data, filePath });
        console.log('Data saved to CSV');
    } catch (error) {
        console.error('Error saving to CSV:', error);
    }
}


async function calculateEntryTime() {
    const destinationName = document.getElementById('destinationName').value;
    const distanceFromEntry = parseInt(document.getElementById('distanceFromEntry').value, 10);
    const trucksPerDay = parseInt(document.getElementById('trucksPerDay').value, 10);
    const parkingDuration = parseInt(document.getElementById('parkingDuration').value, 10);

    try {
        const entryTime = await invoke('calculate_entry_time', { distanceFromEntry, trucksPerDay, parkingDuration });
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
        for (let i = 1; i <= trucksPerDay; i++) {
            const entryTime = await window.__TAURI__.invoke('calculate_entry_time', { distanceFromEntry, trucksPerDay, parkingDuration, availableParkingSpots });
            addToTable(destinationName, entryTime, i);
        }
    } catch (error) {
        console.error('Error calculating entry time:', error);
    }
}

function addToTable(destinationName, entryTime, truckNumber) {
    const table = document.getElementById('truckSchedule').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const idCell = newRow.insertCell(0);
    const entryTimeCell = newRow.insertCell(1);
    const selectCell = newRow.insertCell(2);

    // Generate ID based on destination name and truck number
    const id = destinationName.match(/[A-Z]/g).join('') + "_" + truckNumber;
    idCell.textContent = id;

    entryTimeCell.textContent = entryTime;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    selectCell.appendChild(checkbox);

    // Apply random pastel color
    const pastelColors = ['pastelColor1', 'pastelColor2']; // Add more colors as needed
    const randomColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
    newRow.classList.add(randomColor);
}




function deleteSelected() {
    const table = document.getElementById('truckSchedule').getElementsByTagName('tbody')[0];
    Array.from(table.rows).forEach(row => {
        if (row.cells[2].getElementsByTagName('input')[0].checked) {
            table.deleteRow(row.rowIndex - 1);
        }
    });
}
