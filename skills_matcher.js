// resumeJDMatcher.js
import fs from 'fs';

// ============================================================================
// INPUT: PASTE YOUR RESUME TEXT HERE
// ============================================================================
const resumeText = `
JOHN DOE
Software Engineer
Email: john.doe@email.com | Phone: (555) 123-4567

SUMMARY
Experienced software engineer with 5 years of expertise in building scalable web applications.
Proficient in JavaScript, React, and Node.js with a strong foundation in database design.

EXPERIENCE
Senior Software Engineer | Tech Corp | 2021 - Present
- Developed web applications using React and Redux
- Built RESTful APIs with Node.js and Express
- Implemented CI/CD pipelines using Jenkins
- Worked with PostgreSQL databases
- Collaborated using Agile methodologies

Software Developer | StartUp Inc | 2019 - 2021
- Created responsive interfaces with HTML, CSS, and JavaScript
- Deployed applications on AWS EC2 instances
- Used Git for version control

SKILLS
Languages: JavaScript, Python, HTML, CSS
Frameworks: React, Express, Flask
Databases: PostgreSQL, MySQL
Cloud: AWS (EC2, S3)
Tools: Git, Jenkins, Jira
Methodologies: Agile, Scrum
`;

// ============================================================================
// INPUT: PASTE JOB DESCRIPTION TEXT HERE
// ============================================================================
const jobDescriptionText = `
Senior Full Stack Developer

About the Role:
We are seeking a talented Senior Full Stack Developer to join our engineering team.

Required Skills:
- 5+ years of experience in software development
- Strong proficiency in JavaScript/TypeScript
- Expert knowledge of React and Next.js
- Experience with Node.js and Express
- Proficiency in PostgreSQL and MongoDB
- Experience with Docker and Kubernetes
- Strong understanding of AWS services (EC2, S3, Lambda)
- Experience with GraphQL APIs
- Knowledge of Redis for caching
- Familiarity with Terraform for infrastructure
- CI/CD pipeline experience (GitHub Actions preferred)
- Experience with microservices architecture
- Strong knowledge of TypeScript
- Experience with test-driven development (Jest, Cypress)

Preferred Skills:
- Experience with Python and FastAPI
- Knowledge of Azure or GCP
- Experience with Elasticsearch
- Familiarity with RabbitMQ or Kafka
- Experience with monitoring tools (Datadog, Prometheus)
- Knowledge of security best practices

Soft Skills:
- Excellent communication skills
- Team collaboration
- Problem-solving abilities
- Agile/Scrum experience
- Leadership and mentoring
`;

// ============================================================================
// KEYWORD EXTRACTION AND ANALYSIS
// ============================================================================

function extractSkills(text) {
    const skills = new Set();

    // Common technology patterns
    const patterns = [
        // Programming Languages
        /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|PHP|Ruby|Swift|Kotlin|Scala)\b/gi,
        // Web Frameworks
        /\b(React|Angular|Vue\.js|Next\.js|Nuxt|Svelte|Express|Django|Flask|FastAPI|Spring|NestJS|Laravel)\b/gi,
        // Databases
        /\b(PostgreSQL|MySQL|MongoDB|Redis|Cassandra|DynamoDB|Elasticsearch|Oracle|SQL Server|MariaDB)\b/gi,
        // Cloud Platforms
        /\b(AWS|Azure|GCP|Google Cloud|Heroku|DigitalOcean|EC2|S3|Lambda|RDS|CloudFront)\b/gi,
        // DevOps & Tools
        /\b(Docker|Kubernetes|Jenkins|GitHub Actions|GitLab CI|CircleCI|Travis CI|Terraform|Ansible|Chef|Puppet)\b/gi,
        // Version Control & Collaboration
        /\b(Git|GitHub|GitLab|Bitbucket|SVN|Jira|Confluence|Slack|Trello)\b/gi,
        // APIs & Protocols
        /\b(REST|RESTful|GraphQL|gRPC|WebSocket|SOAP|API)\b/gi,
        // Testing
        /\b(Jest|Mocha|Chai|Cypress|Selenium|Puppeteer|JUnit|PyTest|TDD|BDD|Unit Testing|Integration Testing|E2E)\b/gi,
        // Methodologies
        /\b(Agile|Scrum|Kanban|DevOps|Microservices|CI\/?CD|Waterfall|TDD|BDD)\b/gi,
        // Message Queues
        /\b(RabbitMQ|Kafka|Redis|ActiveMQ|ZeroMQ)\b/gi,
        // Monitoring & Logging
        /\b(Datadog|Prometheus|Grafana|New Relic|Splunk|ELK Stack|Kibana)\b/gi,
        // Frontend
        /\b(HTML5?|CSS3?|SASS|SCSS|Less|Tailwind|Bootstrap|Material UI|Webpack|Vite|Babel)\b/gi,
        // State Management
        /\b(Redux|MobX|Vuex|Context API|Recoil|Zustand)\b/gi,
        // Other
        /\b(Node\.js|npm|yarn|pnpm|Nginx|Apache|Linux|Unix|Bash|Shell)\b/gi,
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach(match => {
            // Normalize the skill name
            const normalized = match.trim().replace(/\s+/g, ' ');
            skills.add(normalized);
        });
    });

    return Array.from(skills);
}

function normalizeSkill(skill) {
    // Create variations for better matching
    const normalized = skill.toLowerCase().trim();
    return {
        original: skill,
        normalized: normalized,
        variations: [
            normalized,
            normalized.replace(/\s+/g, ''),
            normalized.replace(/[.\-\/]/g, ''),
            normalized.replace(/\.js$/i, ''),
            normalized.replace(/^node$/i, 'nodejs'),
        ]
    };
}

function skillExistsInText(skill, text) {
    const normalizedText = text.toLowerCase();
    const skillObj = normalizeSkill(skill);

    return skillObj.variations.some(variation =>
        normalizedText.includes(variation)
    );
}

function analyzeResumeVsJD(resume, jd) {
    const jdSkills = extractSkills(jd);
    const resumeSkills = extractSkills(resume);

    const existingSkills = [];
    const missingSkills = [];

    // Check which JD skills are in resume
    jdSkills.forEach(skill => {
        if (skillExistsInText(skill, resume)) {
            existingSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    // Find extra skills in resume not mentioned in JD
    const extraSkills = resumeSkills.filter(skill =>
        !skillExistsInText(skill, jd)
    );

    return {
        jdSkills,
        resumeSkills,
        existingSkills,
        missingSkills,
        extraSkills
    };
}

function categorizeSkills(skills) {
    const categories = {
        'Programming Languages': [],
        'Web Frameworks & Libraries': [],
        'Databases & Caching': [],
        'Cloud & Infrastructure': [],
        'DevOps & CI/CD': [],
        'Testing': [],
        'Methodologies': [],
        'Tools & Version Control': [],
        'Other Technologies': []
    };

    const categoryPatterns = {
        'Programming Languages': /javascript|typescript|python|java|c\+\+|c#|go|rust|php|ruby|swift|kotlin|scala/i,
        'Web Frameworks & Libraries': /react|angular|vue|next|nuxt|svelte|express|django|flask|fastapi|spring|nest|laravel|redux|mobx/i,
        'Databases & Caching': /postgresql|mysql|mongodb|redis|cassandra|dynamodb|elasticsearch|oracle|sql|mariadb/i,
        'Cloud & Infrastructure': /aws|azure|gcp|google cloud|heroku|ec2|s3|lambda|docker|kubernetes|terraform|ansible/i,
        'DevOps & CI/CD': /jenkins|github actions|gitlab ci|circleci|travis|cicd|ci\/cd|devops|nginx|apache/i,
        'Testing': /jest|mocha|chai|cypress|selenium|puppeteer|junit|pytest|tdd|bdd|testing/i,
        'Methodologies': /agile|scrum|kanban|microservices|waterfall/i,
        'Tools & Version Control': /git|github|gitlab|bitbucket|jira|confluence|slack|trello|npm|yarn|webpack|vite/i,
    };

    skills.forEach(skill => {
        let categorized = false;

        for (const [category, pattern] of Object.entries(categoryPatterns)) {
            if (pattern.test(skill)) {
                categories[category].push(skill);
                categorized = true;
                break;
            }
        }

        if (!categorized) {
            categories['Other Technologies'].push(skill);
        }
    });

    return categories;
}

function calculateMatchScore(existing, total) {
    return ((existing.length / total.length) * 100).toFixed(1);
}

function generateReport(analysis) {
    const matchScore = calculateMatchScore(analysis.existingSkills, analysis.jdSkills);

    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUME vs JOB DESCRIPTION ANALYSIS');
    console.log('='.repeat(80) + '\n');

    console.log(`📊 MATCH SCORE: ${matchScore}%`);
    console.log(`\n📈 Summary:`);
    console.log(`   • Total skills required in JD: ${analysis.jdSkills.length}`);
    console.log(`   • Skills you have from JD: ${analysis.existingSkills.length}`);
    console.log(`   • Skills you're missing from JD: ${analysis.missingSkills.length}`);
    console.log(`   • Extra skills you have: ${analysis.extraSkills.length}`);

    // Match quality indicator
    console.log(`\n🎯 Match Quality:`);
    if (matchScore >= 80) {
        console.log(`   ⭐⭐⭐⭐⭐ EXCELLENT MATCH! You're highly qualified for this role.`);
    } else if (matchScore >= 60) {
        console.log(`   ⭐⭐⭐⭐ GOOD MATCH! You meet most requirements.`);
    } else if (matchScore >= 40) {
        console.log(`   ⭐⭐⭐ MODERATE MATCH. Consider highlighting relevant experience.`);
    } else {
        console.log(`   ⭐⭐ NEEDS IMPROVEMENT. Many required skills are missing.`);
    }

    // Existing Skills
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SKILLS YOU HAVE (From Job Description)');
    console.log('='.repeat(80) + '\n');

    if (analysis.existingSkills.length > 0) {
        const existingCategorized = categorizeSkills(analysis.existingSkills);
        Object.entries(existingCategorized).forEach(([category, skills]) => {
            if (skills.length > 0) {
                console.log(`\n📁 ${category}:`);
                skills.forEach(skill => {
                    console.log(`   ✓ ${skill}`);
                });
            }
        });
    } else {
        console.log('   ⚠️  No matching skills found!');
    }

    // Missing Skills
    console.log('\n\n' + '='.repeat(80));
    console.log('❌ SKILLS YOU\'RE MISSING (Required in Job Description)');
    console.log('='.repeat(80) + '\n');

    if (analysis.missingSkills.length > 0) {
        const missingCategorized = categorizeSkills(analysis.missingSkills);
        Object.entries(missingCategorized).forEach(([category, skills]) => {
            if (skills.length > 0) {
                console.log(`\n📁 ${category}:`);
                skills.forEach(skill => {
                    console.log(`   ✗ ${skill}`);
                });
            }
        });
    } else {
        console.log('   🎉 You have all required skills!');
    }

    // Extra Skills
    console.log('\n\n' + '='.repeat(80));
    console.log('➕ ADDITIONAL SKILLS YOU HAVE (Not in JD but valuable)');
    console.log('='.repeat(80) + '\n');

    if (analysis.extraSkills.length > 0) {
        const extraCategorized = categorizeSkills(analysis.extraSkills);
        Object.entries(extraCategorized).forEach(([category, skills]) => {
            if (skills.length > 0) {
                console.log(`\n📁 ${category}:`);
                skills.forEach(skill => {
                    console.log(`   + ${skill}`);
                });
            }
        });
    } else {
        console.log('   No additional skills identified.');
    }

    // Recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('💡 ACTIONABLE RECOMMENDATIONS');
    console.log('='.repeat(80) + '\n');

    if (analysis.missingSkills.length > 0) {
        console.log('🎯 Priority Actions:\n');
        console.log('   1. UPDATE YOUR RESUME:');
        analysis.missingSkills.slice(0, 5).forEach((skill, i) => {
            console.log(`      • Add "${skill}" if you have any experience with it`);
        });

        console.log('\n   2. LEARN THESE SKILLS:');
        console.log('      Focus on the most critical missing skills for this role');

        console.log('\n   3. HIGHLIGHT EXISTING SKILLS:');
        console.log('      Make sure your matching skills are prominent in your resume');
    } else {
        console.log('   🎉 You\'re well-qualified! Make sure your resume clearly showcases all these skills.');
    }

    console.log('\n📌 Application Tips:');
    console.log('   • Tailor your resume summary to mention key matching skills');
    console.log('   • Use exact terminology from the job description');
    console.log('   • Provide specific examples of using these technologies');
    console.log('   • Quantify your achievements where possible');
    console.log('   • Address missing skills in your cover letter if you\'re learning them\n');
}

function saveResults(analysis) {
    const matchScore = calculateMatchScore(analysis.existingSkills, analysis.jdSkills);

    // Format for easy frontend consumption
    const output = {
        timestamp: new Date().toISOString(),
        matchScore: parseFloat(matchScore),
        matchScorePercentage: matchScore + '%',
        summary: {
            totalJDSkills: analysis.jdSkills.length,
            matchingSkills: analysis.existingSkills.length,
            missingSkills: analysis.missingSkills.length,
            extraSkills: analysis.extraSkills.length
        },

        // Existing skills - flat array format
        existingSkillsFlat: analysis.existingSkills,

        // Missing skills - flat array format
        missingSkillsFlat: analysis.missingSkills,

        // Extra skills - flat array format
        extraSkillsFlat: analysis.extraSkills,

        // Categorized format for grouped display
        existingSkillsCategorized: categorizeSkills(analysis.existingSkills),
        missingSkillsCategorized: categorizeSkills(analysis.missingSkills),
        extraSkillsCategorized: categorizeSkills(analysis.extraSkills),

        // Priority recommendations (top 5 missing)
        priorityMissingSkills: analysis.missingSkills.slice(0, 5),

        // All skills for reference
        allJDSkills: analysis.jdSkills,
        allResumeSkills: analysis.resumeSkills
    };

    fs.writeFileSync('resume-jd-analysis.json', JSON.stringify(output, null, 2));
    console.log('💾 Detailed analysis saved to resume-jd-analysis.json\n');

    return output;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('🚀 Starting Resume vs Job Description Analysis...\n');

const analysis = analyzeResumeVsJD(resumeText, jobDescriptionText);
generateReport(analysis);
const results = saveResults(analysis);

console.log('='.repeat(80));
console.log('✨ Analysis Complete!');
console.log('='.repeat(80) + '\n');

// Print frontend-ready JSON structure
console.log('📦 FRONTEND-READY JSON OUTPUT:');
console.log('='.repeat(80) + '\n');

const frontendOutput = {
    matchScore: results.matchScore,
    summary: results.summary,
    existingSkills: results.existingSkillsFlat,
    missingSkills: results.missingSkillsFlat,
    extraSkills: results.extraSkillsFlat,
    priorityMissingSkills: results.priorityMissingSkills
};

console.log(JSON.stringify(frontendOutput, null, 2));
console.log('\n' + '='.repeat(80));

/*
SAMPLE FRONTEND-READY OUTPUT:

{
  "matchScore": 45.8,
  "summary": {
    "totalJDSkills": 24,
    "matchingSkills": 11,
    "missingSkills": 13,
    "extraSkills": 7
  },
  "existingSkills": [
    "JavaScript",
    "Python",
    "React",
    "Express",
    "PostgreSQL",
    "AWS",
    "EC2",
    "S3",
    "CI/CD",
    "Agile",
    "Scrum",
    "Node.js"
  ],
  "missingSkills": [
    "TypeScript",
    "Next.js",
    "FastAPI",
    "MongoDB",
    "Redis",
    "Elasticsearch",
    "Lambda",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Terraform",
    "GitHub Actions",
    "Jest",
    "Cypress",
    "microservices",
    "GitHub",
    "GraphQL",
    "RabbitMQ",
    "Kafka",
    "Datadog",
    "Prometheus"
  ],
  "extraSkills": [
    "Flask",
    "Redux",
    "MySQL",
    "Jenkins",
    "Jira",
    "RESTful",
    "HTML",
    "CSS"
  ],
  "priorityMissingSkills": [
    "TypeScript",
    "Next.js",
    "FastAPI",
    "MongoDB",
    "Redis"
  ]
}

USAGE IN FRONTEND:

// React Example
const DisplaySkills = ({ data }) => {
  return (
    <div>
      <h2>Match Score: {data.matchScore}%</h2>
      
      <h3>Skills You Have ({data.existingSkills.length})</h3>
      <ul>
        {data.existingSkills.map(skill => (
          <li key={skill}>✓ {skill}</li>
        ))}
      </ul>
      
      <h3>Missing Skills ({data.missingSkills.length})</h3>
      <ul>
        {data.missingSkills.map(skill => (
          <li key={skill}>✗ {skill}</li>
        ))}
      </ul>
      
      <h3>Priority to Learn</h3>
      <ul>
        {data.priorityMissingSkills.map(skill => (
          <li key={skill}>🎯 {skill}</li>
        ))}
      </ul>
    </div>
  );
};

// Vue Example
<template>
  <div>
    <h2>Match Score: {{ matchScore }}%</h2>
    
    <h3>Existing Skills</h3>
    <ul>
      <li v-for="skill in existingSkills" :key="skill">
        ✓ {{ skill }}
      </li>
    </ul>
    
    <h3>Missing Skills</h3>
    <ul>
      <li v-for="skill in missingSkills" :key="skill">
        ✗ {{ skill }}
      </li>
    </ul>
  </div>
</template>

// Fetch API Example
fetch('/api/analyze-resume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ resume, jobDescription })
})
.then(res => res.json())
.then(data => {
  console.log('Match Score:', data.matchScore);
  console.log('Existing:', data.existingSkills);
  console.log('Missing:', data.missingSkills);
});

*/