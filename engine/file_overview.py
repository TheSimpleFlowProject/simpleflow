from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/deepseek-coder-1.3b-instruct", trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained("deepseek-ai/deepseek-coder-1.3b-instruct", trust_remote_code=True).to("cpu")
messages=[
    { 'role': 'user', 'content': 
        """Give me the documentation about this code\n

use std::fs;
use std::path::{Path, PathBuf};

/*
    This struct holds the result of processing a directory.
 */
struct DirectoryResults {
    total_files: u32,
    total_lines: u32,
    total_bytes: u32,
    total_dirs: u32,
    total_empty_lines: u32,
    total_comments: u32,
    total_code_lines: u32,
}

/*
    This struct represents the Langtop engine.
 */
pub struct Langtop {
    folder: String,
    path: PathBuf,
    total_files: u32,
    total_lines: u32,
    total_bytes: u32,
    total_dirs: u32,
    total_empty_lines: u32,
    total_comments: u32,
    total_code_lines: u32,
    is_valid: bool,
}

/*
    Implementation of the Langtop struct.
 */
impl Langtop {
    /*
        Constructor for the Langtop struct.
     */
    pub fn new(path: &str) -> Langtop {
        let path_buf = PathBuf::from(path);
        Langtop {
            folder: Langtop::extract_folder_name(path),
            path: path_buf.clone(),
            total_files: 0,
            total_lines: 0,
            total_bytes: 0,
            total_dirs: 0,
            total_empty_lines: 0,
            total_comments: 0,
            total_code_lines: 0,
            is_valid: Langtop::is_valid_folder(&path_buf),
        }
    }

    /*
        Extract the folder name from the path.
     */
    fn extract_folder_name(path: &str) -> String {
        let path = Path::new(path);
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("")
            .to_string()
    }

    /*
        Check if the path is a valid folder.
     */
    fn is_valid_folder(path: &Path) -> bool {
        path.exists() && path.is_dir()
    }

    /*
        Execute the Langtop engine.
     */
    pub fn execute(&mut self) {
        // Check if the folder path is valid, if not, panic
        if !self.is_valid {
            panic!("Invalid folder path");
        }

        // Process the directory and get the results
        let results = self.process_directory(&self.path);

        // Update the state based on the results
        self.total_files = results.total_files;
        self.total_lines = results.total_lines;
        self.total_bytes = results.total_bytes;
        self.total_dirs = results.total_dirs;
        self.total_empty_lines = results.total_empty_lines;
        self.total_comments = results.total_comments;
        self.total_code_lines = results.total_code_lines;
    }

    /*
        Process the directory and return the results.
     */
    fn process_directory(&self, dir_path: &Path) -> DirectoryResults {
        let mut total_files = 0;
        let mut total_lines = 0;
        let mut total_bytes = 0;
        let mut total_dirs = 0;
        let mut total_empty_lines = 0;
        let mut total_comments = 0;
        let mut total_code_lines = 0;

        if let Ok(entries) = fs::read_dir(dir_path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    println!("[/] Folder: {}", path.display());
                    total_dirs += 1;
                    // Recursively process subdirectories
                    let subdir_results = self.process_directory(&path);
                    total_files += subdir_results.total_files;
                    total_lines += subdir_results.total_lines;
                    total_bytes += subdir_results.total_bytes;
                    total_dirs += subdir_results.total_dirs;
                    total_empty_lines += subdir_results.total_empty_lines;
                    total_comments += subdir_results.total_comments;
                    total_code_lines += subdir_results.total_code_lines;
                } else if let Ok(file_content) = fs::read_to_string(&path) {
                    println!("[*] File: {}", path.display());
                    total_files += 1;
                    total_bytes += file_content.len() as u32;

                    let mut empty_lines: u32 = 0;
                    let mut comments: u32 = 0;
                    let mut code_lines: u32 = 0;
                    let mut in_comment_block: bool = false;

                    for line in file_content.lines() {
                        let trimmed = line.trim();
                        if trimmed.is_empty() && !in_comment_block {
                            // Empty line outside a comment block
                            empty_lines += 1;
                        } else if trimmed.starts_with("/*") || trimmed.ends_with("*/") {
                            // Start or end of a comment block
                            in_comment_block = !in_comment_block;
                        } else if trimmed.starts_with("//") || trimmed.starts_with("#") || in_comment_block {
                            // Comment line or line inside a comment block
                            comments += 1;
                        } else {
                            // Line of code
                            code_lines += 1;
                        }
                    }

                    total_lines += (empty_lines + comments + code_lines) as u32;
                    total_empty_lines += empty_lines;
                    total_comments += comments;
                    total_code_lines += code_lines;
                }
            }
        }

        DirectoryResults {
            total_files,
            total_lines,
            total_bytes,
            total_dirs,
            total_empty_lines,
            total_comments,
            total_code_lines,
        }
    }

    pub fn print_summary(&self) {
        println!("Folder name: {}", self.folder);
        println!("Folder path: {}", self.path.display());
        println!("Is valid folder: {}", self.is_valid);
        println!("Total files: {}", self.total_files);
        println!("Total lines: {}", self.total_lines);
        println!("Total bytes: {}", self.total_bytes);
        println!("Total directories: {}", self.total_dirs);
        println!("Total empty lines: {}", self.total_empty_lines);
        println!("Total comments: {}", self.total_comments);
        println!("Total code lines: {}", self.total_code_lines);
    }
}

        """}
]

inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt").to("cpu")
outputs = model.generate(inputs, max_new_tokens=512, do_sample=False, top_k=50, top_p=0.95, num_return_sequences=1, eos_token_id=tokenizer.eos_token_id)
print(tokenizer.decode(outputs[0][len(inputs[0]):], skip_special_tokens=True))
print("---")
print(outputs)