#!/bin/bash

# Creates sample data for local development and testing
# Author: Andres Gomez (AngocA)
# Version: 2025-10-21

set -e

echo "Creating sample data for local development..."

# Create directories
mkdir -p data/indexes data/users data/countries

# Create metadata
cat > data/metadata.json << 'EOF'
{
  "export_date": "2025-10-21T12:00:00Z",
  "total_users": 3,
  "total_countries": 2,
  "version": "1.0.0"
}
EOF

# Create user index
cat > data/indexes/users.json << 'EOF'
[
  {
    "user_id": 1,
    "username": "mapper_one",
    "history_whole_open": 1543,
    "history_whole_closed": 892,
    "history_year_open": 156,
    "history_year_closed": 89
  },
  {
    "user_id": 2,
    "username": "note_solver",
    "history_whole_open": 234,
    "history_whole_closed": 2341,
    "history_year_open": 23,
    "history_year_closed": 234
  },
  {
    "user_id": 3,
    "username": "community_mapper",
    "history_whole_open": 567,
    "history_whole_closed": 423,
    "history_year_open": 67,
    "history_year_closed": 45
  }
]
EOF

# Create country index
cat > data/indexes/countries.json << 'EOF'
[
  {
    "country_id": 1,
    "country_name": "Colombia",
    "country_name_en": "Colombia",
    "country_name_es": "Colombia",
    "history_whole_open": 54321,
    "history_whole_closed": 23456,
    "history_year_open": 5432,
    "history_year_closed": 2345
  },
  {
    "country_id": 2,
    "country_name": "Ecuador",
    "country_name_en": "Ecuador",
    "country_name_es": "Ecuador",
    "history_whole_open": 12345,
    "history_whole_closed": 6789,
    "history_year_open": 1234,
    "history_year_closed": 678
  }
]
EOF

# Create sample user profile
cat > data/users/1.json << 'EOF'
{
  "dimension_user_id": 1,
  "user_id": 1,
  "username": "mapper_one",
  "date_starting_creating_notes": "2015-03-20",
  "date_starting_solving_notes": "2015-04-15",
  "first_open_note_id": 100,
  "first_closed_note_id": 200,
  "id_contributor_type": 2,
  "last_year_activity": "001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003004005006007008009001002003",
  "lastest_open_note_id": 9999,
  "lastest_closed_note_id": 8888,
  "hashtags": [
    {"rank": 1, "hashtag": "#mapathon", "quantity": 45},
    {"rank": 2, "hashtag": "#survey", "quantity": 23},
    {"rank": 3, "hashtag": "#import", "quantity": 12}
  ],
  "countries_open_notes": [
    {"rank": 1, "country": "Colombia", "quantity": 1200},
    {"rank": 2, "country": "Ecuador", "quantity": 343}
  ],
  "working_hours_of_week_opening": [],
  "history_whole_open": 1543,
  "history_whole_commented": 456,
  "history_whole_closed": 892,
  "history_whole_closed_with_comment": 678,
  "history_whole_reopened": 23,
  "history_year_open": 156,
  "history_year_commented": 45,
  "history_year_closed": 89,
  "history_year_closed_with_comment": 67,
  "history_year_reopened": 2,
  "history_month_open": 12,
  "history_month_closed": 8,
  "history_day_open": 1,
  "history_day_closed": 0
}
EOF

# Create sample country profile
cat > data/countries/1.json << 'EOF'
{
  "dimension_country_id": 1,
  "country_id": 1,
  "country_name": "Colombia",
  "country_name_es": "Colombia",
  "country_name_en": "Colombia",
  "date_starting_creating_notes": "2013-06-15",
  "date_starting_solving_notes": "2013-07-20",
  "first_open_note_id": 50,
  "first_closed_note_id": 75,
  "last_year_activity": "123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123456789123",
  "hashtags": [
    {"rank": 1, "hashtag": "#mapathon", "quantity": 450},
    {"rank": 2, "hashtag": "#survey", "quantity": 230},
    {"rank": 3, "hashtag": "#validation", "quantity": 120}
  ],
  "users_open_notes": [
    {"rank": 1, "username": "mapper_one", "quantity": 1200},
    {"rank": 2, "username": "note_solver", "quantity": 890},
    {"rank": 3, "username": "community_mapper", "quantity": 456}
  ],
  "working_hours_of_week_opening": [],
  "history_whole_open": 54321,
  "history_whole_commented": 12345,
  "history_whole_closed": 23456,
  "history_whole_closed_with_comment": 18900,
  "history_whole_reopened": 1234,
  "history_year_open": 5432,
  "history_year_closed": 2345,
  "history_month_open": 543,
  "history_month_closed": 234
}
EOF

echo "✅ Sample data created successfully!"
echo ""
echo "Files created:"
echo "  - data/metadata.json"
echo "  - data/indexes/users.json"
echo "  - data/indexes/countries.json"
echo "  - data/users/1.json"
echo "  - data/countries/1.json"
echo ""
echo "You can now start the development server:"
echo "  npm run dev"
echo "  or"
echo "  npm run serve"


