#!/usr/bin/env node

const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const API_DIR = 'dist/api/v1';
const WEB_CONTENT = 'web/content';

// Convert date from DD/MM/YYYY to YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// YAML frontmatter helper
function yamlify(obj) {
  let yaml = '---\n';
  for (let [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'string') {
      // Escape quotes and handle multiline
      value = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      yaml += `${key}: "${value}"\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  yaml += '---\n';
  return yaml;
}

// Generate content for a language
async function generateLanguage(lang) {
  const quarterliesPath = `${API_DIR}/${lang}/quarterlies/index.json`;
  if (!fs.existsSync(quarterliesPath)) return;

  const quarterlies = JSON.parse(fs.readFileSync(quarterliesPath));
  
  // Create language index
  const langDir = `${WEB_CONTENT}/${lang}`;
  fs.ensureDirSync(langDir);
  fs.writeFileSync(`${langDir}/_index.md`, yamlify({
    title: lang.toUpperCase(),
    type: 'language'
  }));

  for (const quarterly of quarterlies) {
    const qDir = `${WEB_CONTENT}/${lang}/${quarterly.id}`;
    fs.ensureDirSync(qDir);

    // Quarterly index with all required fields
    fs.writeFileSync(`${qDir}/_index.md`, yamlify({
      title: quarterly.title,
      description: quarterly.description || '',
      human_date: quarterly.human_date || '',
      start_date: convertDate(quarterly.start_date),
      end_date: convertDate(quarterly.end_date),
      type: 'quarterly',
      cover: quarterly.cover || '',
      color_primary: quarterly.color_primary || '#333',
      color_primary_dark: quarterly.color_primary_dark || '#222'
    }));

    // Load lessons
    const quarterlyDataPath = `${API_DIR}/${quarterly.path}/index.json`;
    if (!fs.existsSync(quarterlyDataPath)) continue;
    
    const quarterlyData = JSON.parse(fs.readFileSync(quarterlyDataPath));

    for (const lesson of quarterlyData.lessons || []) {
      const lDir = `${qDir}/${lesson.id}`;
      fs.ensureDirSync(lDir);

      // Lesson index with all required fields
      fs.writeFileSync(`${lDir}/_index.md`, yamlify({
        title: lesson.title,
        start_date: convertDate(lesson.start_date),
        end_date: convertDate(lesson.end_date),
        type: 'lesson',
        cover: lesson.cover || ''
      }));

      // Load days
      const lessonDataPath = `${API_DIR}/${lesson.path}/index.json`;
      if (!fs.existsSync(lessonDataPath)) continue;

      const lessonData = JSON.parse(fs.readFileSync(lessonDataPath));

      for (const day of lessonData.days || []) {
        const readPath = `${API_DIR}/${day.path}/read/index.json`;
        if (!fs.existsSync(readPath)) continue;

        const read = JSON.parse(fs.readFileSync(readPath));
        
        const dayContent = yamlify({
          title: read.title,
          date: convertDate(read.date),
          type: 'day'
        }) + '\n' + read.content;

        fs.writeFileSync(`${lDir}/${day.id}.md`, dayContent);
      }
    }
    console.log(`Generated: ${lang}/${quarterly.id}`);
  }
}

// Main
async function main() {
  const languages = glob.sync(`${API_DIR}/*/`).map(p => path.basename(p)).filter(l => l !== 'languages');
  
  for (const lang of languages) {
    await generateLanguage(lang);
  }
  
  console.log('Done! Hugo content generated in web/content/');
}

main().catch(console.error);
