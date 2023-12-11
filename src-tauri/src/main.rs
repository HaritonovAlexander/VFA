// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use csv::Writer;
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
fn save_to_csv(data: Vec<String>, file_path: PathBuf) -> Result<(), String> {
    println!("save_to_csv called with path {:?}", file_path);
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    let mut wtr = Writer::from_writer(file);

    for record in data {
        let row: Vec<&str> = record.split(',').collect();
        wtr.write_record(&row).map_err(|e| e.to_string())?;
    }

    wtr.flush().map_err(|e| e.to_string())?;
    Ok(())
}

// New function to convert time in seconds to 24-hour format
fn convert_to_24_hour_format(time_in_seconds: f64) -> String {
    let hours = (time_in_seconds as i32) / 3600;
    let minutes = (time_in_seconds as i32 % 3600) / 60;
    let seconds = time_in_seconds as i32 % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

#[tauri::command]
fn calculate_entry_time(
    distance_from_entry: i32,
    trucks_per_day: i32,
    parking_duration: i32,
    available_parking_spots: i32,
) -> Result<Vec<(f64, String)>, String> {
    let max_speed_kmh = 20.0;
    let max_speed_mps = max_speed_kmh / 3.6; // Convert km/h to m/s
    let travel_time = (distance_from_entry as f64 / max_speed_mps) * 2.0; // Round trip travel time in seconds

    // Calculate the minimum interval between truck entries
    let min_interval = travel_time + parking_duration as f64;

    let mut entry_times = Vec::new();

    if available_parking_spots >= trucks_per_day {
        // All trucks can arrive at the same time
        for _ in 0..trucks_per_day {
            entry_times.push(0.0);
        }
    } else {
        // Calculate the number of groups and the size of each group
        let groups = (trucks_per_day + available_parking_spots - 1) / available_parking_spots;
        let mut remaining_trucks = trucks_per_day;

        let mut current_time = 0.0;
        for _ in 0..groups {
            let trucks_in_group = std::cmp::min(remaining_trucks, available_parking_spots);
            for _ in 0..trucks_in_group {
                entry_times.push(current_time);
            }
            current_time += min_interval;
            remaining_trucks -= trucks_in_group;
        }
    }

    let times = entry_times
        .iter()
        .map(|&time| {
            let formatted_time = convert_to_24_hour_format(time);
            (time, formatted_time) // Return both original and formatted time
        })
        .collect();

    Ok(times)
}
