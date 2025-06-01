
# SynergyLearn - Your AI-Powered Collaborative Learning Platform

Welcome to SynergyLearn! This platform is designed to help you organize, plan, track, and achieve your educational goals through a combination of powerful AI tools, collaborative features, and personalized learning management.

## Table of Contents

1.  [Getting Started](#getting-started)
    *   [Accessing the App](#accessing-the-app)
    *   [Account Creation (Sign Up)](#account-creation-sign-up)
    *   [Logging In](#logging-in)
2.  [Core Concepts](#core-concepts)
3.  [Main Navigation (Sidebar)](#main-navigation-sidebar)
4.  [Key Features in Detail](#key-features-in-detail)
    *   [Dashboard](#dashboard-feature)
    *   [Setting Your Learning Goal](#setting-your-learning-goal-feature)
    *   [Managing Your Roadmap](#managing-your-roadmap-feature)
    *   [Using the Progress Map](#using-the-progress-map-feature)
    *   [Taking Notes](#taking-notes-feature)
    *   [Generating & Using Flashcards/Quizzes](#generating--using-flashcardsquizzes-feature)
    *   [Planning Your Schedule & Time Tracking](#planning-your-schedule--time-tracking-feature)
    *   [Collaborating in Study Rooms](#collaborating-in-study-rooms-feature)
    *   [Tracking Analytics](#tracking-analytics-feature)
    *   [Earning Rewards (Gamification)](#earning-rewards-gamification-feature)
    *   [AI Tools](#ai-tools-feature)
    *   [Settings](#settings-feature)
5.  [Theme Customization](#theme-customization)
6.  [Tips & Notes](#tips--notes)

## Getting Started

### Accessing the App
SynergyLearn is a web application accessible through your browser.

### Account Creation (Sign Up)
1.  Navigate to the **Sign Up** page (usually linked from the landing page or `/signup`).
2.  Enter your email address and choose a strong password.
3.  Confirm your password.
4.  Click the "Sign Up" button.
5.  Upon successful registration, you'll typically be redirected to the main dashboard.

### Logging In
1.  Navigate to the **Login** page (usually linked from the landing page or `/login`).
2.  Enter your registered email address and password.
3.  Click the "Login" button.
4.  You will be redirected to your dashboard.

## Core Concepts

*   **Dashboard-centric Approach**: Your main hub for an overview of your learning activities and quick access to features.
*   **Learning Goal**: Your primary, overarching objective that guides your learning path (set via the Roadmap page).
*   **Roadmap & Milestones**: Break down your main learning goal into smaller, manageable steps (milestones) on the Roadmap page.
*   **Schedule & Weekly Outline**: Plan your learning over time by generating a weekly topic outline and then detailed daily tasks for each week on the Schedule page. This is what the Progress Map visualizes.
*   **AI Assistance**: SynergyLearn integrates AI to help you:
    *   Suggest learning milestones.
    *   Generate flashcards and quizzes from your notes or any text.
    *   Generate weekly learning outlines based on your overall goal and availability.
    *   Generate detailed daily tasks for each week of your schedule.
    *   Assist in study room chats (answer questions, summarize discussions).

## Main Navigation (Sidebar)

The primary way to navigate SynergyLearn is through the collapsible sidebar located on the left. On smaller screens, it might be hidden by default and can be opened using the menu icon (hamburger or panel icon).

*   **Dashboard (`/`)**:
    *   Provides an at-a-glance overview of your learning journey.
    *   Shows key statistics like your active goal, milestones completed, and overall progress (based on roadmap milestones).
    *   Includes a simplified progress chart.
    *   Offers "Quick Actions" to jump to common tasks like creating a new note or viewing your roadmap.
    *   If not logged in, this path shows the landing page.

*   **Roadmap (`/roadmap`)**:
    *   **Main Learning Goal**: View or set your primary learning goal (e.g., "Master Web Development"). This is the highest-level objective.
    *   **Custom Milestones**: Add, edit, and manage your own milestones to break down the main goal. You can set titles, descriptions, and statuses (`todo`, `inprogress`, `done`).
    *   **AI Milestone Suggestions**: Input your main goal, current skills (optional), and learning preferences (optional) to get AI-generated milestone ideas. You can then add these suggestions to your roadmap.
    *   To set your main learning goal for the first time or change it, you'll be directed to `/roadmap/new` or can initiate it from here.

*   **Progress Map (`/progress-map`)**:
    *   Visually displays your journey through the **weekly topics generated on the Schedule page**.
    *   Each card on the map represents a week from your schedule's `weeklyOutline`.
    *   Shows the week's topic, dates, and its current status (Todo, In Progress, Done) based on the current date relative to the week's start/end dates.
    *   Your overall learning goal (from your user profile, same as the Roadmap goal) is shown as the final destination.

*   **Notes (`/notes`)**:
    *   View a list of all your created notes.
    *   Create new notes (`/notes/new`).
    *   Edit existing notes (`/notes/[id]`). Notes support **Markdown** for rich text formatting (headings, bold, italics, lists, etc.).
    *   From an individual note's page, you can navigate to generate flashcards/quizzes specifically for that note.
    *   Delete notes (with confirmation).

*   **Flashcards & Quizzes (`/flashcards-quizzes`)**:
    *   View all your saved study collections (sets of flashcards and quizzes).
    *   Each collection card shows the title, number of flashcards/quizzes, and source (if generated from a note).
    *   **View Collection (`/flashcards-quizzes/[collectionId]`)**:
        *   Study flashcards: Flip to see answers, navigate next/previous.
        *   Take quizzes: Select answers, reveal correct answers.
        *   Delete the entire collection.
        *   If generated from a note, a link to regenerate/edit from the source note is available.
    *   Create new custom collections via the "AI Flashcard & Quiz Generator" page.

*   **Schedule (`/schedule`)**:
    *   **Time Tracking Section**:
        *   Clock In/Out for study sessions.
        *   Start/End Breaks and Lunch.
        *   Displays current session status, duration of current activity (session/break/lunch), total time studied today, estimated time for today's tasks (from the daily schedule), and a progress indicator (e.g., "X hours to cover").
    *   **Tabs**:
        *   **Configure & Outline**:
            *   Define a primary learning goal for this specific schedule (can be the same or different from your main roadmap goal).
            *   Set the total schedule duration (1 Month, 1 Year, 2 Years).
            *   Specify your typical working day start and end times for study.
            *   Select weekly holidays (days you usually take off).
            *   Optionally provide specific study start/end times for those holiday days if you plan to study on them.
            *   Use the "Utilize Holidays" checkbox to allow AI to schedule tasks on holidays if deemed necessary for the goal, even if no specific holiday study times are set.
            *   **Generate Weekly Outline**: AI creates a high-level plan, breaking your schedule goal into weekly topics based on your inputs. This populates the `weeklyOutline` that the Progress Map uses.
        *   **Weekly Details**:
            *   Once an outline is generated, select a specific week from the dropdown.
            *   View the week's topic, dates, and any AI-generated summary for that week.
            *   **Generate Daily Plan**: For the selected week, AI generates a detailed day-by-day task list, including topics, estimated durations, and suggested time slots, respecting your configured availability.
            *   View the generated daily tasks in a table. You can also regenerate this daily plan.

*   **Study Rooms (`/study-rooms`)**:
    *   View a list of available public study rooms.
    *   **Create New Room**: Set a name and topic for a new collaborative space.
    *   **Join Room (`/study-rooms/[id]`)**:
        *   **Chat Tab**:
            *   Send and receive real-time messages.
            *   **Mentions**: Type `@` followed by a user's name to mention them (e.g., `@JohnDoe`). A suggestion popup will appear.
            *   **AI Helper**: Type `@help_me` followed by your question (e.g., `@help_me explain photosynthesis`) to ask the in-chat AI assistant.
            *   **Slash Commands**: Type `/` to see available commands. A suggestion popup will appear.
                *   `/summarize`: Get an AI-generated summary of the recent chat messages.
                *   `/suggestion [your query]` or `/ask [your query]`: Ask the AI helper for ideas or answers to questions.
            *   **Edit/Delete Messages**: Hover over your own messages to reveal edit and delete icons below the message. AI messages cannot be edited/deleted.
        *   **Whiteboard Tab**:
            *   A shared, real-time whiteboard.
            *   **Tools**: Pen, Eraser.
            *   **Controls**: Select color, stroke width.
            *   **Clear**: Button to clear the entire whiteboard for everyone.
        *   **Room Info**: View room name, topic, member count, and a list of current members.
        *   **Leave Room**: Exit the study room.

*   **Analytics (`/analytics`)**:
    *   Displays statistics about your learning:
        *   Total Study Hours (from time tracking on the Schedule page).
        *   Completed Milestones (from the Roadmap page).
        *   Notes Taken.
        *   Learning Consistency (based on active days, currently a placeholder).
    *   Charts for "Weekly Study Activity" and "Time Allocation by Subject" (currently using placeholder data; full implementation requires more detailed data logging).
    *   A section for "Focus Areas & Improvement Suggestions" (placeholder for future AI insights).

*   **Rewards (`/gamification`)**:
    *   View your learning points and current level.
    *   See progress towards the next level.
    *   Display earned badges (badge earning logic is currently placeholder; badges shown are illustrative).
    *   A section for a "Leaderboard" (marked as "Coming Soon").

*   **AI Tools (Sidebar Sub-menu)**:
    *   **Milestone Suggestions (`/ai/milestone-suggestions`)**: A dedicated page to input a learning goal, current skills, and preferences to get AI-suggested milestones. You can add these directly to your main Roadmap.
    *   **Flashcard Generator (`/ai/flashcard-generator`)**: Paste any text (notes, articles, etc.) to have AI generate flashcards and quiz questions. You can then save these as a new study collection.

*   **Settings (`/settings`)**:
    *   **Profile**: Basic user information (username, email - currently placeholders/not fully editable).
    *   **Appearance**: Toggle between Light and Dark themes.
    *   **AI & Learning Preferences**: Set preferred learning style and topics (these are placeholders for future AI personalization).
    *   **Notifications**: Manage app and email notification preferences (these are placeholders).
    *   **Account & Security**: Placeholder links/buttons for managing subscriptions, privacy policy, and account deletion.
    *   "Save Changes" button (currently just shows a toast, actual settings persistence for many items is not fully implemented).

## Key Features in Detail

### Dashboard (Feature)
*   **Access**: `/` (after login)
*   **Purpose**: Central hub for a quick overview.
*   **UI**:
    *   Page header showing current learning goal (if set).
    *   Statistic cards: Active Goals, Milestones Completed, Overall Progress.
    *   Progress bar for overall progress.
    *   Simplified bar chart for monthly progress (placeholder data).
    *   Quick Action buttons: New Note, View Roadmap, Get Milestone Suggestions, AI Flashcard Generator.
    *   A promotional banner for SynergyLearn features.
*   **Navigation**: Click "New Goal" to go to `/roadmap/new`. Quick action buttons link to respective pages.

### Setting Your Learning Goal (Feature)
*   **Access**: Via Dashboard "New Goal", or directly to `/roadmap/new`, or prompted from the Roadmap page if no goal is set.
*   **Purpose**: Define your main, high-level learning objective. This goal is displayed on your Roadmap and Dashboard.
*   **UI (`/roadmap/new`)**:
    *   Input field for "Goal Title".
    *   Textarea for "Goal Description (Optional)".
    *   "Set Goal & View Roadmap" button.
*   **How to use**:
    1.  Enter a clear title for your goal.
    2.  Optionally, add a description.
    3.  Click "Set Goal & View Roadmap". This saves the goal to your user profile and takes you to the main Roadmap page.

### Managing Your Roadmap (Feature)
*   **Access**: `/roadmap`
*   **Purpose**: Break down your main learning goal into actionable milestones and track their progress.
*   **UI**:
    *   Displays your current main learning goal at the top.
    *   **Current Milestones Section**:
        *   Lists all added milestones as cards. Each card shows title, description, and a status dropdown (`Todo`, `In Progress`, `Done`).
        *   "Edit" and "Delete" buttons for each milestone.
        *   "Add Custom Milestone" button at the top of the page (opens a dialog).
    *   **AI Milestone Suggestions Section**:
        *   Input fields for "Current Skills" and "Learning Preferences" (optional inputs for the AI).
        *   "Suggest Milestones" button.
        *   If suggestions are generated, they appear in a list, each with a "+" button to add it to your current milestones.
*   **How to use**:
    1.  **Set/View Main Goal**: If no goal is set, you'll be prompted to create one.
    2.  **Add Custom Milestones**:
        *   Click "Add Custom Milestone".
        *   In the dialog, enter a "Title" and optional "Description". Default status is "Todo".
        *   Click "Add Milestone".
    3.  **Edit Milestones**:
        *   Click the "Edit" icon on a milestone card.
        *   In the dialog, modify title, description, or status.
        *   Click "Save Changes".
    4.  **Change Milestone Status**: Use the dropdown on the milestone card directly.
    5.  **Delete Milestones**: Click the "Delete" icon and confirm in the alert dialog.
    6.  **Get AI Suggestions**:
        *   Ensure your main learning goal is set (it's used as input for the AI).
        *   Optionally fill in "Current Skills" and "Learning Preferences".
        *   Click "Suggest Milestones".
        *   Review the AI's list and click "+" on any suggestion to add it to your roadmap.

### Using the Progress Map (Feature)
*   **Access**: `/progress-map` (via Sidebar)
*   **Purpose**: To visualize your progression through the weekly learning topics defined in your "Schedule".
*   **UI**:
    *   Displays your main learning goal (from profile) as the final destination on the map.
    *   Shows a horizontal path with cards representing each week from your `weeklyOutline` (generated on the Schedule page).
    *   Each "week card" displays:
        *   Week Number and Topic/Goal.
        *   Start and End Dates for that week.
        *   An icon and color indicating status:
            *   `Circle` (muted): Todo (week is in the future).
            *   `Loader2` (blue, spinning): In Progress (current week).
            *   `CheckCircle` (green): Done (week has passed).
    *   Connecting lines link the start point, weekly cards, and the final goal.
*   **How to use**:
    1.  First, ensure you have set a "Primary Learning Goal" on the Roadmap page.
    2.  Then, go to the "Schedule" page, fill in your availability, and click "Generate Weekly Outline". This creates the data the Progress Map uses.
    3.  Navigate to the "Progress Map" page to see your weekly schedule visualized. The statuses update automatically based on the current date.

### Taking Notes (Feature)
*   **Access**: `/notes` for list, `/notes/new` to create, `/notes/[id]` to edit.
*   **Purpose**: Create, organize, and edit study notes.
*   **UI**:
    *   **Notes List Page (`/notes`)**:
        *   Displays notes as cards, showing title, last updated date, and a snippet of content.
        *   "New Note" button.
        *   Each note card has links to "Edit", "Flashcards/Quiz" (for that note), and "Delete".
    *   **Note Detail/Edit Page (`/notes/[id]` or `/notes/new`)**:
        *   Large input field for the note "Title".
        *   Large textarea for the note "Content". Markdown is supported for formatting.
        *   "Save Note" / "Update Note" button.
        *   If editing an existing note, a "Flashcards/Quiz" button links to generate study materials for this specific note.
        *   Placeholder "Share" button.
*   **How to use**:
    1.  **Create a Note**: Click "New Note". Enter a title and content (using Markdown if desired). Click "Save Note".
    2.  **Edit a Note**: From the notes list, click a note's title or "Edit" icon. Modify content. Click "Update Note".
    3.  **Delete a Note**: From the notes list, click the "Delete" icon on a note card and confirm.
    4.  **Markdown**: Use standard Markdown syntax in the content area (e.g., `# Heading 1`, `## Heading 2`, `**bold**`, `*italic*`, `- list item`, `[link text](url)`).

### Generating & Using Flashcards/Quizzes (Feature)
*   **Purpose**: Create study materials (flashcards and multiple-choice quizzes) either from your notes or from any custom text, and then study them.
*   **Access Routes**:
    *   From a specific note: Navigate to `/notes/[id]`, then click "Flashcards/Quiz" to go to `/notes/[id]/generate-flashcards`.
    *   Generic Generator: Navigate to `/ai/flashcard-generator` (via AI Tools in sidebar).
    *   View Saved Collections: `/flashcards-quizzes`.
    *   View Specific Collection: `/flashcards-quizzes/[collectionId]`.
*   **UI & How to Use**:
    1.  **Generation Page (either `/notes/[id]/generate-flashcards` or `/ai/flashcard-generator`)**:
        *   **Source Text**:
            *   If from a note, the note's content is pre-filled in a textarea. You can edit this text before generation if needed (changes here don't affect the original note).
            *   If from the generic generator, paste any text into the textarea.
        *   **Generate Button**: Click "Generate Flashcards & Quizzes". AI will process the text.
        *   **Generated Flashcards Section**:
            *   Displays one flashcard at a time (Question).
            *   "Show/Hide Answer" button.
            *   Navigation buttons (Previous/Next) and counter (e.g., "1 / 10").
        *   **Generated Quizzes Section**:
            *   Lists multiple-choice questions.
            *   Click an option to select your answer.
            *   "Show Answer" button for each quiz question (reveals correct/incorrect).
            *   Correct answer is highlighted green; if you selected an incorrect one, it's highlighted red.
        *   **Save Collection Section**:
            *   Button "Save to My Collection" (opens a dialog).
            *   In the dialog, enter a "Collection Title" (pre-filled if from a note or with a default for custom sets).
            *   Click "Save". The current set of flashcards and quizzes is saved.
    2.  **My Flashcards & Quizzes Page (`/flashcards-quizzes`)**:
        *   Displays a list of all your saved study collections as cards.
        *   Each card shows title, counts of flashcards/quizzes, source (if any), and creation date.
        *   "View Collection" button on each card (links to `/flashcards-quizzes/[collectionId]`).
        *   "Delete" button (with confirmation) on each card.
    3.  **View Collection Page (`/flashcards-quizzes/[collectionId]`)**:
        *   Displays the title and source of the collection.
        *   **Flashcards Section**: Same interactive flashcard viewer as on the generation page.
        *   **Quizzes Section**: Same interactive quiz viewer.
        *   "Delete Collection" button (with confirmation).
        *   "Regenerate/Edit Source" button (if the collection was generated from a specific note, links back to `/notes/[noteId]/generate-flashcards`).

### Planning Your Schedule & Time Tracking (Feature)
*   **Access**: `/schedule`
*   **Purpose**: Plan your long-term learning with AI-generated weekly and daily tasks, and track your study time.
*   **UI**:
    *   **Time Tracking Bar (Top of page)**:
        *   Displays current tracking status (Clocked Out, Clocked In, On Break, On Lunch).
        *   Shows live timers for current session, break, or lunch duration.
        *   Shows "Studied Today" (total logged time for the day).
        *   Shows "Target Today" (total estimated duration from today's scheduled tasks).
        *   Shows "Progress" (e.g., "X hours to cover" or "On track!").
        *   Buttons: "Clock In", "Clock Out", "Start Break", "End Break", "Start Lunch", "End Lunch". Buttons are enabled/disabled based on current status.
    *   **Tabs**:
        *   **Configure & Outline**:
            *   **Learning Goal Input**: For the overall goal of this schedule.
            *   **Schedule Duration Select**: 1 Month, 1 Year, 2 Years.
            *   **Working Day Availability Inputs**: Start Time, End Time (e.g., 09:00 to 17:00).
            *   **Weekly Holidays Checkboxes**: Select days you typically don't study.
            *   **Holiday Availability Inputs (Optional)**: If you select holidays but still want to study on them for a specific duration, enter start/end times here.
            *   **Utilize Holidays Checkbox**: If checked, AI can schedule tasks on selected holidays (even without specific holiday times set) if it's important for the goal.
            *   **Generate Weekly Outline Button**: AI processes these inputs and creates a high-level list of topics, one for each week of the selected duration. Each weekly item includes start/end dates. This outline is saved.
        *   **Weekly Details**:
            *   **Week Selector Dropdown**: Choose a week from the generated outline.
            *   **Selected Week Info**: Displays the chosen week's number, topic, dates, and any AI-generated summary for that week.
            *   **Daily Tasks Section**:
                *   If no daily tasks are generated yet for this week, a "Generate Daily Plan for Week X" button appears.
                *   Clicking it prompts the AI to break down the selected weekly topic into day-by-day tasks, considering your configured availability (working hours, holidays).
                *   **Daily Tasks Table**: Shows Date, Day of Week, Topic/Task, Estimated Duration, and Suggested Time Slot for each day of that week.
                *   "Regenerate Daily Plan" button allows you to get a new set of daily tasks for the week.
*   **How to use**:
    1.  **Configure**: Go to the "Configure & Outline" tab.
        *   Enter your schedule's learning goal.
        *   Set duration, working hours, and holidays.
        *   Click "Generate Weekly Outline". The page will update to show this outline, and you might be automatically switched to the "Weekly Details" tab.
    2.  **Plan Daily Tasks**: Go to "Weekly Details".
        *   Select a week from the dropdown.
        *   Click "Generate Daily Plan for Week X".
        *   Review the generated tasks.
    3.  **Track Time**:
        *   Use the "Clock In" button when you start studying.
        *   Use "Start Break" / "End Break" or "Start Lunch" / "End Lunch" as needed.
        *   Click "Clock Out" when you finish your study session.
        *   Your "Studied Today" time will update, and the "Progress" indicator will compare it against the estimated time for any tasks scheduled for the current day.

### Collaborating in Study Rooms (Feature)
*   **Access**: `/study-rooms` for list, `/study-rooms/[id]` to join/view.
*   **Purpose**: Real-time collaborative learning with chat and a shared whiteboard.
*   **UI**:
    *   **Study Rooms List Page (`/study-rooms`)**:
        *   Displays available rooms as cards (name, topic, member count).
        *   "Create New Room" button (opens a dialog).
        *   "Join Room" button on each card.
    *   **Study Room Detail Page (`/study-rooms/[id]`)**:
        *   **Header**: Room name, topic, member avatars, member count, "Leave" button.
        *   **Tabs**: "Whiteboard" and "Chat".
        *   **Chat Tab**:
            *   **Message Display Area**: Shows messages chronologically. Your messages on the right, others on the left. AI messages have a distinct style. Shows username, avatar, timestamp, and "(edited)" if applicable. Mentions (`@User`, `@help_me`) are highlighted.
            *   **Message Input Bar (Bottom)**:
                *   Input field: Type messages. Supports `@` for user/AI mentions and `/` for commands. A suggestion popup appears as you type these.
                *   Send button.
            *   **Edit/Delete Controls**: For your own messages, hover to see "Edit" and "Delete" icons below the message. Clicking "Edit" replaces the message with a textarea and Save/Cancel buttons. Delete prompts for confirmation.
        *   **Whiteboard Tab**:
            *   **Canvas Area**: The shared drawing surface.
            *   **Toolbar (Top)**:
                *   Tool selection: Pen, Eraser.
                *   Color palette: Predefined colors to choose for the pen.
                *   Stroke width selector: Buttons to choose different line thicknesses.
                *   Clear button: Clears the entire whiteboard for all users (with confirmation).
*   **How to use**:
    1.  **Create a Room**: On `/study-rooms`, click "Create New Room". Enter name and topic.
    2.  **Join a Room**: Click "Join Room" on a room card.
    3.  **Chat**:
        *   Type messages in the input bar and press Enter or click Send.
        *   Type `@` and start typing a name to mention a user or `help_me` for the AI. Select from the suggestion popup.
        *   Type `/` and start typing a command (e.g., `summarize`, `suggestion`). Select from the popup.
        *   For `/suggestion your idea` or `/ask your question`, the AI will respond in the chat.
        *   To edit your message, hover, click edit icon, change text, click save.
        *   To delete, hover, click delete icon, confirm.
    4.  **Whiteboard**:
        *   Select "Pen" or "Eraser".
        *   If Pen, select a color and stroke width.
        *   Draw on the canvas. Changes are seen by all members in real-time.
        *   Click "Clear" if you want to erase everything (usually only room creator or admin should do this).
    5.  **Leave**: Click the "Leave" button in the header.

### Tracking Analytics (Feature)
*   **Access**: `/analytics`
*   **Purpose**: Visualize your learning progress and habits.
*   **UI**:
    *   **Overall Stats Cards**: Total Study Hours, Completed Milestones, Notes Taken, Learning Consistency.
    *   **Weekly Study Activity Chart**: Line chart (placeholder data) intended to show study hours and tasks completed per day of the week.
    *   **Time Allocation by Subject Chart**: Pie chart (placeholder data) intended to show how time is spent across different subjects/topics.
    *   **Focus Areas & Improvement Suggestions Card**: Placeholder for future AI-driven insights.
*   **How to use**:
    *   Visit the page to see your stats. Data for "Total Study Hours" comes from the Schedule page's time tracker. "Completed Milestones" comes from your Roadmap. "Notes Taken" is a count of your notes.
    *   Note that some charts and the consistency metric are currently illustrative or use simplified data.

### Earning Rewards (Gamification) (Feature)
*   **Access**: `/gamification`
*   **Purpose**: To motivate learning through points, levels, and badges.
*   **UI**:
    *   **Overall Progress Card**: Shows total points, current level, and a progress bar to the next level.
    *   **Badges Earned Card**: Displays a grid of available badges. Achieved badges are highlighted, others are shown as locked. Badge descriptions explain the criteria (criteria are currently illustrative).
    *   **Leaderboard Card**: Marked as "Coming Soon".
*   **How to use**:
    *   Engage with the platform (completing tasks, creating notes, etc. - specific point/badge triggers are mostly conceptual at this stage).
    *   Check this page to see your progress.

### AI Tools (Feature)
*   These are centralized locations for specific AI functionalities, also accessible from other parts of the app.
    *   **Milestone Suggestions (`/ai/milestone-suggestions`)**:
        *   **UI**: Input for "Primary Learning Goal", "Current Skills", "Learning Preferences". "Suggest Milestones" button. List of suggestions with "+" to add to roadmap.
        *   **How to use**: Similar to the AI suggestions on the Roadmap page, but as a standalone tool.
    *   **Flashcard Generator (`/ai/flashcard-generator`)**:
        *   **UI**: Textarea to paste any text. "Generate" button. Displays generated flashcards and quizzes. "Save Collection" button.
        *   **How to use**: Paste text, generate, review, and save as a new collection.

### Settings (Feature)
*   **Access**: `/settings`
*   **Purpose**: Manage account and application preferences.
*   **UI**:
    *   **Profile Card**: Placeholders for username, email, "Change Password" button.
    *   **Appearance Card**: "Dark Mode" toggle switch.
    *   **AI & Learning Preferences Card**: Placeholders for "Preferred Learning Style" (dropdown) and "Preferred Topics" (input). "Enable AI Personalized Learning Path" checkbox (placeholder).
    *   **Notifications Card**: Toggle switches for "Enable App Notifications" and "Email Notifications" (placeholders).
    *   **Account & Security Card**: Placeholder buttons for "Manage Subscription", "View Privacy Policy", "Delete Account".
    *   "Save Changes" button at the top of the page (shows a toast; many settings are not yet saved to backend).
*   **How to use**:
    *   Toggle Dark Mode for theme changes.
    *   Other settings are mostly illustrative for now. Click "Save Changes" to see a confirmation toast.

## Theme Customization
*   **Toggle**: You can switch between Light and Dark themes using:
    *   The Sun/Moon icon in the user navigation dropdown (top-right of the main application layout).
    *   The "Dark Mode" switch on the `/settings` page.
*   The theme preference is saved in your browser's local storage.

## Tips & Notes
*   **AI Generation**: If an AI generation task (milestones, flashcards, schedule plans) fails or takes too long, try simplifying your input text or try again after a short while. AI models can sometimes be busy.
*   **Saving Regularly**: For notes or complex configurations, save your progress periodically.
*   **Firebase Security Rules**: For developers or those self-hosting, ensure your Firestore security rules are correctly configured to allow reads/writes to the appropriate collections (`users/{userId}/...`, `studyRooms`, etc.) for the application to function fully. The application includes detailed console error messages for permission issues to help debug rules.
*   **Placeholders**: Some features or data displays (e.g., certain analytics charts, gamification triggers) are currently placeholders or use illustrative data. These will be enhanced in future updates.

We hope this comprehensive guide helps you make the most of SynergyLearn! Happy learning!
        