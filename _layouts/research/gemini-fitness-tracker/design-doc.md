# FitnessMonitor.ai

## PRD

### 1. Product Overview
**Product Name:** FitnessMonitor.ai  
**Vision:** An intelligent fitness tracker that uses AI to provide personalized health insights and recommendations  
**Mission:** Simplify health tracking through natural language input and provide actionable AI-driven insights.

### 2. Core Features

#### 2.1 Natural Language Data Input
- **Description:** Users can log health data using natural language (e.g., "20 pushups", "1 glass of coffee", "current weight is 84.5kg")
- **AI Processing:** Powered by Google Gemini API to parse and categorize user input
- **Supported Categories:** Weight, food/nutrition, water intake, exercise, general health data

#### 2.2 Real-time Dashboard
- **Today's Overview:** Live calorie tracking, water progress, exercise summary, fasting status
- **Latest Weight Card:** Current weight with distance-to-goal visualization and motivational messaging
- **Calorie & Nutrients:** Remaining calories, macronutrient breakdown (protein, carbs, fat)
- **Water Tracking:** Circular progress indicator with target completion
- **Exercise Summary:** Today's workout table with calories burned
- **Fasting Tracker:** Time since last fast-breaking meal with AI analysis

#### 2.3 AI-Powered Weekly Analysis
- **Smart Insights:** AI analyzes last 7 days of data across all health metrics
- **Three-Category Feedback:**
  - Things you're doing great
  - Areas needing attention  
  - Personalized suggestions
- **Goal Alignment:** Analysis specifically targets weight loss, muscle building, skin health, and overall fitness
- **Caching:** Intelligent caching with data change detection

#### 2.4 Data Visualization
- **Weight Trend Chart:** Line chart showing weight progression over time
- **Nutrition Overview:** Multi-axis bar chart with calories, water (separate right axis), and macronutrients
- **Exercise Timeline:** Horizontal scrollable cards showing daily exercise history

#### 2.5 Goal Setting & Tracking
- **Configurable Targets:** Base calories, calorie deficit, water target, target weight
- **Progress Indicators:** Visual progress bars and motivational messaging
- **AI Goal Analysis:** Smart calorie calculations and motivational feedback

#### 2.6 Data Management
- **Local Storage:** Offline-first approach with browser localStorage
- **Cloud Backup:** Firebase integration with Google authentication
- **Smart Sync:** Automatic cloud sync with conflict resolution (newer data wins)
- **Export/Import:** Full data portability

### 3. User Experience

#### 3.1 Input Methods
- **Primary:** Floating natural language input at bottom of screen
- **Secondary:** Manual target configuration in settings

#### 3.2 Information Architecture
- **Settings:** Subscription management, authentication, target configuration
- **Dashboard:** Real-time overview with 5 key metric cards
- **Weekly Analysis:** Collapsible AI insights section (usage-gated by tier)
- **Charts:** Historical data visualization
- **Exercise Timeline:** Chronological workout history
- **Audit Log:** Collapsible detailed entry history
- **Billing:** Subscription status, usage tracking, upgrade options

### 4. Technical Requirements

#### 4.1 AI Integration
- **Provider:** Google Gemini 1.5 Flash API
- **API Key:** Server-managed API keys (users no longer need to provide their own)
- **Usage Tiers:** 
  - Free: 50 requests/month
  - Pro: 1,000 requests/month ($4.99/month)
  - Enterprise: Unlimited requests ($19.99/month)
- **Use Cases:** Natural language parsing, weekly analysis, motivational quotes, goal analysis
- **Privacy:** API keys managed server-side, user data processed through secure proxy

#### 4.2 Data Storage
- **Local:** Browser localStorage for offline functionality
- **Cloud:** Firebase Firestore for backup and cross-device sync
- **Authentication:** Google OAuth integration
- **Subscription Data:** User tier, usage tracking, payment status in Firestore
- **Backend Requirements:** Cloud Functions for payment processing and API management

#### 4.3 Performance
- **Offline-first:** Full functionality without internet connection
- **Responsive:** Mobile-optimized design with Tailwind CSS
- **Real-time:** Instant UI updates with efficient re-rendering

### 5. Success Metrics
- **Engagement:** Daily active users, session duration
- **Adoption:** Feature usage rates (AI analysis requests, data entry frequency)
- **Retention:** Weekly/monthly active users
- **User Satisfaction:** AI insight accuracy, goal achievement rates

### 6. Future Enhancements
- **Advanced Analytics:** Trend analysis, prediction models
- **Social Features:** Progress sharing, challenges
- **Integrations:** Wearable devices, third-party health apps
- **Nutrition Database:** Food recognition and automatic macro calculation
- **Workout Planning:** AI-generated exercise recommendations

## Design Doc

### System Architecture

FitnessMonitor.ai follows a simple three-layer architecture:

#### 1. Natural Language Processing Layer
- **Input:** User enters health data in natural language (e.g., "20 pushups", "1 glass of coffee", "weight is 84.5kg")
- **Processing:** Google Gemini API parses text and converts to structured JSON
- **API Management:** Server-managed API keys with usage tracking and tier-based limits
- **Output:** Categorized data objects with standardized fields (category, data, metadata)

#### 2. Data Storage Layer
- **Local-First:** Browser localStorage serves as primary storage for offline functionality
- **Cloud Backup:** When user signs in, data automatically syncs to Firebase Firestore
- **Hybrid Model:** 
  - Not signed in → localStorage only
  - Signed in → localStorage + Firestore with smart sync

#### 3. Authentication & Cloud Layer
- **Authentication:** Firebase Auth with Google OAuth integration
- **Cloud Storage:** Firebase Firestore for cross-device data synchronization
- **Sync Strategy:** Automatic conflict resolution (newer data wins) with user override option

### Data Flow

```
User Input (Natural Language) 
    ↓
Backend API Proxy (Authentication + Rate Limiting)
    ↓
Gemini API (Text → JSON)
    ↓
Usage Tracking (Firestore)
    ↓
Local Storage (Immediate Save)
    ↓
Firebase Sync (If Authenticated)
    ↓
UI Update (Dashboard, Charts, Analysis)
```

### Key Design Decisions

1. **Offline-First:** App works fully without internet connection
2. **Progressive Enhancement:** Cloud features enhance but don't replace local functionality
3. **Smart Caching:** AI analysis results cached locally to minimize API calls
4. **Real-time Updates:** UI updates immediately on data changes without page refresh

### Design update (07/22/2025) - Remove requirements of user provided API key.

#### Overview
Transition from user-provided API keys to a managed service model with tiered access levels.

#### New Requirements

##### 1. Managed API Key Service
- **Free Tier:** Users get up to 50 AI requests per month when signed in
- **Pro Tier:** Users get up to 1,000 AI requests per month + priority processing
<!-- - **Enterprise Tier:** Unlimited requests + advanced analytics + custom integrations -->

##### 2. Subscription Management
- **Free Tier:** Default for all authenticated users
- **Pro Tier:** $9.99/month subscription via Stripe integration
<!-- - **Enterprise Tier:** $19.99/month with additional features -->

##### 3. Backend Infrastructure Changes

###### Firestore Schema Updates
```
users/{userId} {
  email: string,
  subscription: {
    tier: 'free' | 'pro' | 'enterprise',
    status: 'active' | 'cancelled' | 'past_due',
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    currentPeriodStart: timestamp,
    currentPeriodEnd: timestamp
  },
  usage: {
    currentMonth: string, // "2025-07"
    aiRequestsUsed: number,
    lastResetDate: timestamp,
    dailyBreakdown: {
      [date]: { requests: number, features: string[] }
    }
  },
  apiAccess: {
    geminiApiKey: string, // Server-managed, encrypted
    keyRotationDate: timestamp
  }
}
```

###### Usage Tracking System
- **Request Counting:** Every Gemini API call increments user's monthly counter
- **Feature Gating:** Different tiers unlock different AI features
- **Rate Limiting:** Enforce monthly limits with graceful degradation

##### 4. Payment Integration

###### Stripe Integration
- **Subscription Management:** Handle recurring billing for Pro/Enterprise tiers
- **Webhook Handling:** Process subscription status changes (payment failed, cancelled, upgraded)
- **Customer Portal:** Allow users to manage billing, view invoices, update payment methods

###### Payment Flow
```
User clicks "Upgrade to Pro" 
    ↓
Frontend creates Stripe Checkout Session
    ↓
User completes payment on Stripe
    ↓
Stripe webhook updates Firestore subscription status
    ↓
Frontend polls for subscription update
    ↓
UI reflects new tier capabilities
```

##### 5. Architecture Changes

###### Backend Requirements (New)
- **Cloud Functions:** Handle Stripe webhooks, usage tracking, API key management
- **Scheduled Functions:** Monthly usage reset, subscription status checks
- **API Gateway:** Proxy Gemini requests with authentication and rate limiting

###### Frontend Changes
- **Subscription UI:** Pricing page, tier comparison, upgrade prompts
- **Usage Dashboard:** Show remaining requests, feature availability
- **Paywall Logic:** Graceful degradation when limits reached

##### 6. Security Considerations

###### API Key Management
- **Server-Side Storage:** Gemini API keys stored encrypted in Firestore
- **Key Rotation:** Regular rotation of API keys for security
- **Access Control:** Users never see actual API keys

###### Usage Validation
- **Server-Side Validation:** All usage counting happens on backend to prevent tampering
- **Request Authentication:** Every API call validated against user's subscription status

#### Pros and Cons

##### Pros
1. **Better UX:** Users don't need to manage API keys
2. **Monetization:** Clear revenue model with tiered pricing
3. **Scalability:** Can optimize API usage across all users
4. **Security:** Centralized key management reduces exposure
5. **Analytics:** Better insights into feature usage and user behavior

##### Cons
1. **Increased Complexity:** Requires backend infrastructure and payment processing
2. **Operational Costs:** Need to pay for all Gemini API usage upfront
3. **Legal Requirements:** Must handle PCI compliance, terms of service, privacy policy
4. **Vendor Lock-in:** Users become dependent on our service availability

#### Technical Limitations (Frontend + Database Only)

##### Current Approach Limitations
1. **No Server-Side Validation:** Usage limits can be bypassed by manipulating client-side code
2. **API Key Exposure:** Even encrypted keys in Firestore could potentially be accessed by users
3. **Payment Processing:** Cannot securely handle payment webhooks without a backend
4. **Rate Limiting:** No way to enforce real-time rate limits across multiple sessions
5. **Cost Control:** Cannot prevent abuse or unexpected API costs

##### Required Backend Components
1. **Cloud Functions:** Essential for Stripe webhooks and secure API proxying
2. **API Gateway:** Need server-side rate limiting and request validation
3. **Scheduled Jobs:** Required for usage resets and subscription management
4. **Monitoring:** Server-side logging and alerting for cost control

#### Implementation Phases

##### Phase 1: Basic Tier System (MVP)
- Implement usage tracking in Firestore
- Add subscription status to user profile
- Simple client-side tier checking (acknowledging security limitations)
- Basic upgrade UI without payment processing

##### Phase 2: Payment Integration
- Implement Stripe integration with Cloud Functions
- Add webhook handling for subscription events
- Secure API key management
- Server-side usage validation

##### Phase 3: Advanced Features
- Real-time usage monitoring
- Advanced analytics for Pro/Enterprise tiers
- API rate limiting and optimization
- Custom enterprise features

#### Migration Strategy

1. **Gradual Rollout:** Existing users keep API key option temporarily
2. **Onboarding Flow:** New users automatically get Free tier
3. **Data Migration:** Move existing usage patterns to new tracking system
4. **Fallback Support:** Maintain API key input as backup during transition

#### Cost Considerations

- **Gemini API Costs:** Estimate $0.10-0.50 per 1000 requests
- **Infrastructure:** Cloud Functions, Firestore, Stripe fees (~$50-200/month)
- **Break-even:** Need ~100 Pro subscribers to cover operational costs
- **Pricing Strategy:** 50 free requests allows user evaluation, Pro tier provides 20x value