// Pure Fuzzy Logic Resume-Job Matcher (No AI Models)
export class FuzzyLogicMatcher {
    weights = {
        skills: 0.35,
        experience: 0.25,
        tools: 0.20,
        domain: 0.10,
        location: 0.05,
        notice: 0.05
    };

    // Fuzzy membership function for experience matching
    experienceMembership(candidateYears: number, requiredYears: number): number {
        if (candidateYears >= requiredYears * 1.5) {
            return 1.0; // Excellent - significantly exceeds requirement
        } else if (candidateYears >= requiredYears) {
            return 0.9; // Very good - meets or slightly exceeds
        } else if (candidateYears >= requiredYears * 0.8) {
            return 0.7; // Good - close to requirement
        } else if (candidateYears >= requiredYears * 0.6) {
            return 0.5; // Moderate - somewhat below
        } else {
            return candidateYears / requiredYears; // Poor - significantly below
        }
    }

    // Fuzzy membership function for skills/tools matching
    skillMatchMembership(matchedCount: number, totalRequired: number): number {
        if (totalRequired === 0) return 1.0;
        const ratio = matchedCount / totalRequired;

        if (ratio >= 0.9) return 1.0;  // Excellent
        if (ratio >= 0.7) return 0.85; // Very good
        if (ratio >= 0.5) return 0.70; // Good
        if (ratio >= 0.3) return 0.50; // Moderate
        if (ratio >= 0.1) return 0.30; // Poor
        return 0.1; // Very poor
    }

    // Fuzzy membership for location match
    locationMembership(candidateLocation: string, jobLocations: string[]): number {
        if (!candidateLocation || !jobLocations || jobLocations.length === 0) {
            return 0.7; // Neutral if location not specified
        }

        const candLoc = candidateLocation.toLowerCase().trim();

        for (const jobLoc of jobLocations) {
            const jLoc = jobLoc.toLowerCase().trim();
            if (candLoc.includes(jLoc) || jLoc.includes(candLoc)) {
                return 1.0; // Perfect match
            }
        }

        // Check for same state/country
        if (jobLocations.some(loc => loc.toLowerCase().includes('india')) &&
            candLoc.includes('india')) {
            return 0.6; // Same country, different city
        }

        return 0.3; // Different location
    }

    // Fuzzy membership for notice period
    noticeMembership(candidateNotice: string, preferredNotice: string): number {
        if (!candidateNotice || !preferredNotice) return 0.7;

        const candNotice = candidateNotice.toLowerCase();
        const prefNotice = preferredNotice.toLowerCase();

        if (candNotice.includes('immediate') && prefNotice.includes('immediate')) {
            return 1.0; // Perfect match
        }
        if (candNotice.includes('immediate')) {
            return 0.95; // Immediate is always good
        }
        if (candNotice.includes('15') || candNotice.includes('30')) {
            return 0.8; // Reasonable notice period
        }
        if (candNotice.includes('60') || candNotice.includes('90')) {
            return 0.5; // Long notice period
        }
        return 0.6; // Unknown/flexible
    }

    // String matching helper (case-insensitive, partial match)
    fuzzyStringMatch(str1: string, str2: string): boolean {
        if (!str1 || !str2) return false;
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        return s1.includes(s2) || s2.includes(s1);
    }

    // Match skills between candidate and job
    matchSkills(candidateSkills: string[], requiredSkills: string[]): { matched: string[], missing: string[] } {
        const matched: string[] = [];
        const missing: string[] = [];

        for (const reqSkill of requiredSkills) {
            const found = candidateSkills.some(candSkill =>
                this.fuzzyStringMatch(candSkill, reqSkill)
            );
            if (found) {
                matched.push(reqSkill);
            } else {
                missing.push(reqSkill);
            }
        }

        return { matched, missing };
    }

    // Domain matching
    domainMatch(candidateDomains: string[], jobDomains: string[]): number {
        if (!candidateDomains || candidateDomains.length === 0) return 0.5;
        if (!jobDomains || jobDomains.length === 0) return 0.7;

        for (const candDomain of candidateDomains) {
            for (const jobDomain of jobDomains) {
                if (this.fuzzyStringMatch(candDomain, jobDomain)) {
                    return 1.0;
                }
            }
        }
        return 0.4; // No domain match
    }

    // Categorize match score
    categorizeMatch(score: number): string {
        if (score >= 85) return 'Excellent Match';
        if (score >= 70) return 'Good Match';
        if (score >= 55) return 'Moderate Match';
        if (score >= 40) return 'Fair Match';
        return 'Poor Match';
    }

    // Extract skills and tools from resume text
    extractSkillsFromText(text: string): { skills: string[], tools: string[], experience: number } {
        const commonSkills = [
            'Python', 'SQL', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Go',
            'Data Analytics', 'Business Intelligence', 'Data Modeling', 'Statistical Modeling',
            'Data Engineering', 'Machine Learning', 'Deep Learning', 'AI', 'NLP',
            'Data Visualization', 'ETL', 'Data Warehousing', 'Big Data',
            'Power BI', 'Tableau', 'Excel', 'DAX', 'Power Query', 'Report Optimization',
            'Row-Level Security', 'RLS', 'Azure', 'AWS', 'GCP', 'Cloud Computing'
        ];

        const commonTools = [
            'Tableau Desktop', 'Tableau Prep', 'Tableau Cloud', 'Tableau Server',
            'Power BI Desktop', 'Power BI Service', 'Power BI Report Builder', 'Power Automate',
            'MS SQL Server', 'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'Snowflake',
            'Azure Synapse', 'Databricks', 'Microsoft Fabric', 'PySpark', 'Spark',
            'Git', 'GitHub', 'GitLab', 'Bitbucket', 'JIRA', 'Azure DevOps',
            'Docker', 'Kubernetes', 'Jenkins', 'SharePoint', 'APIs', 'Power BI Gateway'
        ];

        const lowerText = text.toLowerCase();
        const skills: string[] = [];
        const tools: string[] = [];

        // Extract skills
        for (const skill of commonSkills) {
            if (lowerText.includes(skill.toLowerCase())) {
                skills.push(skill);
            }
        }

        // Extract tools
        for (const tool of commonTools) {
            if (lowerText.includes(tool.toLowerCase())) {
                tools.push(tool);
            }
        }

        // Extract experience years (look for patterns like "6 years", "6+ years", etc.)
        const expMatch = text.match(/(\d+)\+?\s*years?/i);
        const experience = expMatch ? parseInt(expMatch[1]) : 0;

        return { skills, tools, experience };
    }

    // Extract requirements from job description
    extractRequirementsFromText(text: string): {
        required_skills: string[],
        required_tools: string[],
        required_experience_years: number,
        location: string[]
    } {
        const extracted = this.extractSkillsFromText(text);

        // Extract locations
        const locations: string[] = [];
        const locationKeywords = ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Remote'];
        const lowerText = text.toLowerCase();

        for (const loc of locationKeywords) {
            if (lowerText.includes(loc.toLowerCase())) {
                locations.push(loc);
            }
        }

        return {
            required_skills: extracted.skills,
            required_tools: extracted.tools,
            required_experience_years: extracted.experience,
            location: locations
        };
    }

    // Calculate overall fuzzy score
    calculateScore(resumeText: string, jobDescription: string): {
        finalScore: number,
        breakdown: any,
        category: string,
        skillsMatched: string[],
        skillsMissing: string[],
        toolsMatched: string[],
        toolsMissing: string[]
    } {
        // Extract data from texts
        const candidateData = this.extractSkillsFromText(resumeText);
        const jobData = this.extractRequirementsFromText(jobDescription);

        // Match skills
        const skillsResult = this.matchSkills(
            candidateData.skills,
            jobData.required_skills
        );

        // Match tools
        const toolsResult = this.matchSkills(
            candidateData.tools,
            jobData.required_tools
        );

        // Calculate individual scores
        const scores = {
            skills: this.skillMatchMembership(
                skillsResult.matched.length,
                jobData.required_skills.length || 1
            ),
            experience: this.experienceMembership(
                candidateData.experience,
                jobData.required_experience_years || 0
            ),
            tools: this.skillMatchMembership(
                toolsResult.matched.length,
                jobData.required_tools.length || 1
            ),
            domain: 0.7, // Default domain score
            location: 0.7, // Default location score
            notice: 0.7 // Default notice score
        };

        // Calculate weighted final score
        let finalScore = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            finalScore += scores[key] * weight;
        }

        return {
            finalScore: finalScore * 100,
            breakdown: scores,
            category: this.categorizeMatch(finalScore * 100),
            skillsMatched: skillsResult.matched,
            skillsMissing: skillsResult.missing,
            toolsMatched: toolsResult.matched,
            toolsMissing: toolsResult.missing
        };
    }
}
