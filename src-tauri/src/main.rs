// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use csv::Writer;
use rusqlite::{params, Connection, Result};
use std::fs::File;
use std::path::PathBuf;
use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

fn main() {
    let open = CustomMenuItem::new("open".to_string(), "Open");
    let save = CustomMenuItem::new("save".to_string(), "Save");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let submenu = Submenu::new(
        "File",
        Menu::new().add_item(open).add_item(save).add_item(quit),
    );
    let menu = Menu::new()
        .add_submenu(submenu)
        .add_native_item(MenuItem::Copy);

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|event| match event.menu_item_id() {
            "open" => println!("Open clicked"),
            "save" => println!("Save clicked"),
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_to_sqlite,
            save_to_csv,
            calculate_entry_time
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn open_file(path: PathBuf) -> Result<String, String> {
    // Implement file opening logic here
    Ok(format!("Opened file at {:?}", path))
}

#[tauri::command]
fn save_to_sqlite(data: &str) -> Result<(), String> {
    let conn = Connection::open("my_database.db").map_err(|e| e.to_string())?;

    conn.execute("INSERT INTO my_data (content) VALUES (?1)", params![data])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn save_to_csv(data: Vec<String>, file_path: PathBuf) -> Result<(), String> {
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    let mut wtr = Writer::from_writer(file);
    for record in data {
        wtr.write_record(&[record]).map_err(|e| e.to_string())?;
    }
    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn calculate_entry_time(
    distance_from_entry: i32,
    trucks_per_day: i32,
    parking_duration: i32,
    available_parking_spots: i32,
) -> Result<Vec<String>, String> {
    let trucks_per_hour = trucks_per_day as f64 / 24.0;
    let max_speed_kmh = 20.0;
    let max_speed_mps = max_speed_kmh / 3.6; // Convert km/h to m/s

    // Calculate round trip time in seconds (to destination and back + parking)
    let round_trip_time = (distance_from_entry as f64 / max_speed_mps) * 2.0 + parking_duration as f64;

    // Ensure round_trip_time is sensible
    if round_trip_time <= 0.0 {
        return Err("Invalid round trip time".to_string());
    }

    // Calculate minimum interval between truck entries to avoid queues
    let min_interval = round_trip_time * available_parking_spots as f64;

    // Ensure min_interval is sensible
    if min_interval <= 0.0 {
        return Err("Invalid minimum interval".to_string());
    }

    // Distribute trucks throughout the day
    let mut entry_times = Vec::new();
    let mut current_time = 0.0;
    while current_time < 86400.0 { // 86400 seconds in a day
        entry_times.push(current_time);
        current_time += 86400.0 / (trucks_per_hour * available_parking_spots as f64).max(1.0);
        if current_time - entry_times.last().unwrap() < min_interval {
            current_time = entry_times.last().unwrap() + min_interval;
        }
    }

    // Convert entry times to 24-hour format
    let formatted_times = entry_times
        .iter()
        .map(|&time| format_entry_time(time as i64))
        .collect();

    Ok(formatted_times)
}

fn format_entry_time(seconds: i64) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    let seconds = seconds % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}
