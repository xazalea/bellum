use wasm_bindgen::prelude::*;
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
#[wasm_bindgen(getter_with_clone)]
pub struct GameInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub thumbnail: String,
    pub url: String,
    pub category: String,
    pub width: u32,
    pub height: u32,
}

#[wasm_bindgen]
pub struct GameParser {
    games: Vec<GameInfo>,
}

#[wasm_bindgen]
impl GameParser {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { games: Vec::new() }
    }
    
    /// Parse XML game data (streaming, zero-copy where possible)
    pub fn parse_xml(&mut self, xml_data: &str) -> Result<(), JsValue> {
        let mut reader = Reader::from_str(xml_data);
        reader.trim_text(true);
        
        let mut buf = Vec::new();
        let mut current_game = GameInfo {
            id: String::new(),
            name: String::new(),
            description: String::new(),
            thumbnail: String::new(),
            url: String::new(),
            category: String::new(),
            width: 800,
            height: 600,
        };
        
        let mut in_game = false;
        let mut current_field = String::new();
        
        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(ref e)) => {
                    let name = e.name();
                    let name_str = std::str::from_utf8(name.as_ref())
                        .unwrap_or("");
                    
                    if name_str == "game" {
                        in_game = true;
                        current_game = GameInfo {
                            id: String::new(),
                            name: String::new(),
                            description: String::new(),
                            thumbnail: String::new(),
                            url: String::new(),
                            category: String::new(),
                            width: 800,
                            height: 600,
                        };
                        
                        // Parse attributes
                        for attr in e.attributes() {
                            if let Ok(attr) = attr {
                                let key = std::str::from_utf8(attr.key.as_ref()).unwrap_or("");
                                let value = attr.unescape_value().unwrap_or_default().to_string();
                                
                                match key {
                                    "id" => current_game.id = value,
                                    "width" => current_game.width = value.parse().unwrap_or(800),
                                    "height" => current_game.height = value.parse().unwrap_or(600),
                                    _ => {}
                                }
                            }
                        }
                    } else if in_game {
                        current_field = name_str.to_string();
                    }
                }
                Ok(Event::Text(e)) => {
                    if in_game && !current_field.is_empty() {
                        let text = e.unescape().unwrap_or_default().to_string();
                        match current_field.as_str() {
                            "name" => current_game.name = text,
                            "description" => current_game.description = text,
                            "thumbnail" => current_game.thumbnail = text,
                            "url" => current_game.url = text,
                            "category" => current_game.category = text,
                            _ => {}
                        }
                    }
                }
                Ok(Event::End(ref e)) => {
                    let name = std::str::from_utf8(e.name().as_ref()).unwrap_or("");
                    if name == "game" && in_game {
                        if !current_game.id.is_empty() {
                            self.games.push(current_game.clone());
                        }
                        in_game = false;
                    }
                }
                Ok(Event::Eof) => break,
                Err(e) => return Err(JsValue::from_str(&format!("XML parse error: {}", e))),
                _ => {}
            }
            buf.clear();
        }
        
        Ok(())
    }
    
    /// Get total number of parsed games
    pub fn game_count(&self) -> usize {
        self.games.len()
    }
    
    /// Get games (paginated)
    pub fn get_games(&self, page: usize, page_size: usize) -> Result<JsValue, JsValue> {
        let start = page * page_size;
        let end = std::cmp::min(start + page_size, self.games.len());
        
        if start >= self.games.len() {
            return serde_wasm_bindgen::to_value(&Vec::<GameInfo>::new())
                .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
        }
        
        let slice = &self.games[start..end];
        serde_wasm_bindgen::to_value(slice)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
    
    /// Search games by name
    pub fn search_games(&self, query: &str) -> Result<JsValue, JsValue> {
        let query_lower = query.to_lowercase();
        let results: Vec<&GameInfo> = self.games.iter()
            .filter(|g| g.name.to_lowercase().contains(&query_lower) || 
                       g.description.to_lowercase().contains(&query_lower))
            .collect();
        
        serde_wasm_bindgen::to_value(&results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
    
    /// Filter games by category
    pub fn filter_by_category(&self, category: &str) -> Result<JsValue, JsValue> {
        let results: Vec<&GameInfo> = self.games.iter()
            .filter(|g| g.category == category)
            .collect();
        
        serde_wasm_bindgen::to_value(&results)
            .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
    }
}
