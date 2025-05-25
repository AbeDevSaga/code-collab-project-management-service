const File = require("../models/file");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const BASE_DIR = process.env.FILE_STORAGE_PATH || path.join("C:", "CC-PROJECT-FILES");
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

const getProjectDir = (projectId) => {
  // Convert projectId to string if it's an ObjectId
  const projectIdStr = mongoose.Types.ObjectId.isValid(projectId) 
    ? projectId.toString() 
    : projectId;
  return path.join(BASE_DIR, projectIdStr);
};

const saveFileContent = (filePath, content) => {
  // Handle both base64 and plain text content
  const fileContent = content && content.startsWith('data:') 
    ? Buffer.from(content.split(',')[1], 'base64')
    : content || '';
  fs.writeFileSync(filePath, fileContent);
};

// const createFile = async (userId, fileData, projectId) => {
//   try {
//     const { name, path: filePath, content, organization } = fileData;
//     console.log("filedata:", fileData, "path:", filePath);

//     // Validate required fields
//     if (!name || !filePath) {
//       throw new Error("Name and path are required");
//     }

//     // Create project directory if it doesn't exist
//     const projectDir = getProjectDir(projectId);
//     if (!fs.existsSync(projectDir)) {
//       fs.mkdirSync(projectDir, { recursive: true });
//     }

//     // Normalize and clean the path
//     let normalizedPath = filePath.replace(/\\/g, '/')
//                                 .replace(/^\/|\/$/g, '');
//     const pathSegments = normalizedPath.split('/')
//                                       .filter(segment => segment.trim() !== '');

//     // Build the full path starting from project directory
//     let currentPath = projectDir;
//     for (const segment of pathSegments) {
//       currentPath = path.join(currentPath, segment);
//       if (!fs.existsSync(currentPath)) {
//         fs.mkdirSync(currentPath);
//       }
//     }

//     // Determine file extension
//     const extension = path.extname(name).toLowerCase().substring(1); // Remove the dot
//     const fullPath = path.join(currentPath, name);
    
//     // Save file content
//     saveFileContent(fullPath, content);
//     const size = fs.statSync(fullPath).size;

//     // Determine file type based on extension
//     let fileType = "document";
//     const codeExtensions = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'html', 'css'];
//     const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    
//     if (codeExtensions.includes(extension)) {
//       fileType = "code";
//     } else if (imageExtensions.includes(extension)) {
//       fileType = "image";
//     }

//     const relativePath = path.relative(BASE_DIR, fullPath);

//     const file = new File({
//       name,
//       type: fileType,
//       path: relativePath,
//       size,
//       extension,
//       createdBy: userId,
//       project: projectId,
//       organization,
//       content: content ? content : undefined
//     });

//     await file.save();
//     return file;
//   } catch (error) {
//     console.error(`Error creating file ${fileData?.name || 'unknown'}:`, error);
//     throw error;
//   }
// };

const createFile = async (userId, fileData, projectId) => {
  try {
    console.log("Entering createFile function");
    const { name, content, organization } = fileData;
    
    // Validate required fields
    if (!name) {
      throw new Error("Filename is required");
    }
    if (!content) {
      throw new Error("File content is required");
    }

    // Create project directory
    const projectDir = path.join(BASE_DIR, projectId.toString());
    console.log("Creating directory:", projectDir);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${safeFilename}`;
    const fullPath = path.join(projectDir, uniqueFilename);

    // Save file content
    console.log("Saving file to:", fullPath);
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(fullPath, buffer);

    // Get file stats
    const stats = fs.statSync(fullPath);
    console.log("File saved successfully. Size:", stats.size);

    // Create file record
    const file = new File({
      name: uniqueFilename,
      type: 'document',
      path: `/uploads/${projectId}/${uniqueFilename}`,
      size: stats.size,
      extension: path.extname(name).substring(1).toLowerCase(),
      createdBy: userId,
      project: projectId,
      organization,
      content: undefined // Don't store large content in DB
    });

    await file.save();
    console.log("File record created in database");
    return file;

  } catch (error) {
    console.error("Error in createFile:", {
      file: fileData?.name || 'unknown',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

const updateFile = async (fileId, updates) => {
  try {
    const file = await File.findById(fileId);
    if (!file || file.isDeleted) {
      throw new Error("File not found");
    }

    const oldAbsolutePath = path.join(BASE_DIR, file.path);
    const userDir = getProjectDir(file.createdBy.toString());
    let newPath = oldAbsolutePath;

    // Handle rename if name changed
    if (updates.name && updates.name !== file.name) {
      newPath = path.join(path.dirname(oldAbsolutePath), updates.name);

      if (fs.existsSync(newPath)) {
        throw new Error("A file with that name already exists");
      }

      fs.renameSync(oldAbsolutePath, newPath);
    }

    // Handle content update for files
    if (updates.content !== undefined && file.type === "file") {
      saveFileContent(newPath, updates.content);
    }

    const fileUpdates = {
      name: updates.name || file.name,
      path: updates.name ? path.relative(BASE_DIR, newPath) : file.path,
      updated_at: Date.now(),
    };

    if (updates.content !== undefined && file.type === "file") {
      fileUpdates.content = updates.content;
      fileUpdates.size = Buffer.byteLength(updates.content, "utf8");
    }

    const updatedFile = await File.findByIdAndUpdate(fileId, fileUpdates, {
      new: true,
    });
    return updatedFile;
  } catch (error) {
    console.error("Error updating file:", error);
    throw error;
  }
};

const deleteFile = async (fileId) => {
  try {
    const file = await File.findById(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const absolutePath = path.join(BASE_DIR, file.path);

    try {
      if (file.type === "file" && fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      } else if (file.type === "folder" && fs.existsSync(absolutePath)) {
        fs.rmSync(absolutePath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error("Error deleting file from filesystem:", err);
    }

    await File.findByIdAndDelete(fileId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
};

module.exports = {
  createFile,
  updateFile,
  deleteFile,
};