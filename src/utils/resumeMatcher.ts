import axios from 'axios';

// Fuzzy Logic Scoring System
export class FuzzyLogicMatcher {
    weights = {
        skills: 0.35,
        experience: 0.25,
        tools: 0.20,
        domain: 0.10,
        location: 0.05,
        notice: 0.05
    };

    experienceMembership(candidateYears: number, requiredYears: number) {
        if (candidateYears >= requiredYears) {
            return Math.min(1.0, candidateYears / (requiredYears + 2));
        } else {
            return candidateYears / requiredYears;
        }
    }

    skillMatchMembership(matchedCount: number, totalRequired: number) {
        if (totalRequired === 0) return 0;
        const ratio = matchedCount / totalRequired;

        if (ratio >= 0.8) return 1.0;
        if (ratio >= 0.6) return 0.8;
        if (ratio >= 0.4) return 0.6;
        if (ratio >= 0.2) return 0.4;
        return ratio;
    }

    calculateFuzzyScore(matchData: any) {
        const scores: any = {
            skills: this.skillMatchMembership(matchData.skillsMatched, matchData.skillsRequired),
            experience: this.experienceMembership(matchData.candidateExp, matchData.requiredExp),
            tools: this.skillMatchMembership(matchData.toolsMatched, matchData.toolsRequired),
            domain: matchData.domainMatch ? 1.0 : 0.5,
            location: matchData.locationMatch ? 1.0 : 0.7,
            notice: matchData.noticeMatch ? 1.0 : 0.6
        };

        let finalScore = 0;
        for (const [key, weight] of Object.entries(this.weights)) {
            finalScore += scores[key] * weight;
        }

        return {
            finalScore: finalScore * 100,
            breakdown: scores,
            category: this.categorizeMatch(finalScore * 100)
        };
    }

    categorizeMatch(score: number) {
        if (score >= 80) return 'Excellent Match';
        if (score >= 65) return 'Good Match';
        if (score >= 50) return 'Moderate Match';
        return 'Poor Match';
    }
}

// Resume Job Matcher Class
export class ResumeJobMatcher {
    apiKey: string;
    modelId: string;
    apiUrl: string;
    fuzzyMatcher: FuzzyLogicMatcher;

    constructor(apiKey: string, modelId = 'meta-llama/Llama-2-70b-chat-hf') {
        this.apiKey = apiKey;
        this.modelId = modelId;
        // Use the NEW Hugging Face Router API endpoint
        this.apiUrl = 'https://router.huggingface.co/v1/chat/completions';
        this.fuzzyMatcher = new FuzzyLogicMatcher();
    }

    async callHuggingFaceAPI(prompt: string, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const response = await axios.post(
                    this.apiUrl,
                    {
                        model: this.modelId,
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        max_tokens: 2000,
                        temperature: 0.3,
                        top_p: 0.9
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000
                    }
                );

                if (response.data?.choices?.[0]?.message?.content) {
                    return response.data.choices[0].message.content;
                }

                console.error('Unexpected response format:', JSON.stringify(response.data));
                throw new Error('Invalid response format from API');
            } catch (error: any) {
                if (error.response?.status === 503 && attempt < maxRetries - 1) {
                    console.log(`⏳ Model loading... Retry ${attempt + 1}/${maxRetries} (waiting 30s)`);
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    continue;
                }
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new Error('Invalid API token. Verify your token at: https://huggingface.co/settings/tokens');
                }
                if (error.response?.status === 404) {
                    throw new Error(`Model ${this.modelId} not found or not available for inference.`);
                }
                if (error.response?.data) {
                    console.error('API Error Response:', error.response.data);
                }
                throw error;
            }
        }
    }

    async extractResumeData(resumeText: string) {
        const prompt = `Analyze this resume and extract information in JSON format.

Resume:
${resumeText}

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "name": "candidate name",
  "experience_years": 6,
  "skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "location": "city",
  "notice_period": "immediate/30 days/etc",
  "current_company": "company name",
  "domain_expertise": ["domain1", "domain2"]
}`;

        const response = await this.callHuggingFaceAPI(prompt);
        return this.parseJSON(response);
    }

    async extractJobRequirements(jobDescription: string) {
        const prompt = `Analyze this job description and extract requirements in JSON format.

Job Description:
${jobDescription}

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "position": "job title",
  "required_experience_years": 6,
  "required_skills": ["skill1", "skill2"],
  "required_tools": ["tool1", "tool2"],
  "location": ["location1", "location2"],
  "work_mode": "office/hybrid/remote",
  "notice_preference": "immediate/flexible",
  "key_responsibilities": ["resp1", "resp2"]
}`;

        const response = await this.callHuggingFaceAPI(prompt);
        return this.parseJSON(response);
    }

    async performDetailedMatch(resumeData: any, jobData: any) {
        const prompt = `Compare candidate with job requirements.

Candidate:
${JSON.stringify(resumeData, null, 2)}

Job Requirements:
${JSON.stringify(jobData, null, 2)}

Return ONLY valid JSON (no markdown):
{
  "skills_matched": ["skill1", "skill2"],
  "skills_missing": ["skill1", "skill2"],
  "tools_matched": ["tool1", "tool2"],
  "tools_missing": ["tool1", "tool2"],
  "experience_match": true,
  "location_match": true,
  "strengths": ["strength1", "strength2"],
  "gaps": ["gap1", "gap2"],
  "recommendations": ["rec1", "rec2"]
}`;

        const response = await this.callHuggingFaceAPI(prompt);
        return this.parseJSON(response);
    }

    parseJSON(text: string) {
        try {
            // Remove markdown code blocks if present
            let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            // Try to find JSON object in the text
            const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return JSON.parse(cleaned);
        } catch (error: any) {
            console.error('JSON Parse Error:', error.message);
            console.error('Response text:', text);
            throw new Error('Failed to parse JSON response from AI model');
        }
    }

    async matchResumeToJob(resumeText: string, jobDescription: string) {
        try {
            // console.log('\n🔍 Extracting resume data...');
            const resumeData = await this.extractResumeData(resumeText);
            // console.log('✅ Resume data extracted');

            // console.log('\n🔍 Extracting job requirements...');
            const jobData = await this.extractJobRequirements(jobDescription);
            // console.log('✅ Job requirements extracted');

            // console.log('\n🔍 Performing detailed match analysis...');
            const matchAnalysis = await this.performDetailedMatch(resumeData, jobData);
            // console.log('✅ Match analysis completed');

            // Prepare fuzzy logic input
            const fuzzyInput = {
                skillsMatched: matchAnalysis.skills_matched?.length || 0,
                skillsRequired: jobData.required_skills?.length || 1,
                toolsMatched: matchAnalysis.tools_matched?.length || 0,
                toolsRequired: jobData.required_tools?.length || 1,
                candidateExp: resumeData.experience_years || 0,
                requiredExp: jobData.required_experience_years || 6,
                domainMatch: true,
                locationMatch: jobData.location?.some((loc: string) =>
                    loc.toLowerCase().includes(resumeData.location?.toLowerCase() || '')
                ) || false,
                noticeMatch: resumeData.notice_period?.toLowerCase().includes('immediate') || false
            };

            // Calculate fuzzy logic score
            const fuzzyScore = this.fuzzyMatcher.calculateFuzzyScore(fuzzyInput);

            return {
                candidate: {
                    name: resumeData.name,
                    experience: resumeData.experience_years,
                    location: resumeData.location,
                    currentCompany: resumeData.current_company
                },
                job: {
                    position: jobData.position,
                    requiredExperience: jobData.required_experience_years,
                    locations: jobData.location
                },
                matching: {
                    overallScore: fuzzyScore.finalScore.toFixed(2),
                    category: fuzzyScore.category,
                    scoreBreakdown: fuzzyScore.breakdown,
                    skillsMatched: matchAnalysis.skills_matched,
                    skillsMissing: matchAnalysis.skills_missing,
                    toolsMatched: matchAnalysis.tools_matched,
                    toolsMissing: matchAnalysis.tools_missing,
                    strengths: matchAnalysis.strengths,
                    gaps: matchAnalysis.gaps,
                    recommendations: matchAnalysis.recommendations
                }
            };
        } catch (error: any) {
            console.error('Error in matching process:', error.message);
            throw error;
        }
    }
}
