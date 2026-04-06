def format_complaint(*, complaint_type: str, location: str) -> str:
    safe_location = (location or "the reported area").strip()

    subject_map = {
        "road": "Road Maintenance Issue",
        "water": "Water Supply Issue",
        "garbage": "Garbage Management Issue",
        "electricity": "Electricity Service Issue",
        "general": "Public Service Complaint",
    }

    issue_line_map = {
        "road": f"This is to report a road-related civic issue at {safe_location}.",
        "water": f"This is to report a water supply issue at {safe_location}.",
        "garbage": f"This is to report a garbage management issue at {safe_location}.",
        "electricity": f"This is to report an electricity service issue at {safe_location}.",
        "general": f"This is to report a public service issue at {safe_location}.",
    }

    subject = subject_map.get(complaint_type, subject_map["general"])
    issue_line = issue_line_map.get(complaint_type, issue_line_map["general"])

    return "\n".join(
        [
            f"Subject: {subject}",
            "Respected Sir/Madam,",
            issue_line,
            "The issue needs prompt attention from the concerned department.",
            "Kindly take necessary action.",
            "Thank you.",
        ]
    )
