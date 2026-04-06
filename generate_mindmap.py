#!/usr/bin/env python3
"""Generate a draw.io mind map XML for EasyAppointment System."""

import xml.etree.ElementTree as ET
from xml.dom import minidom

# --- Data Structure ---
# Each branch: (label, color_fill, color_stroke, light_fill, children)
# Children can be strings (leaf) or tuples (label, [sub_children])

LEFT_BRANCHES = [
    {
        "label": "Frontend\n(Next.js)",
        "fill": "#1565C0", "stroke": "#0D47A1", "light": "#BBDEFB",
        "children": [
            ("Pages", [
                "Home Page", "Doctors Listing", "Doctor Profile",
                "Patient Dashboard", "Doctor Dashboard", "Admin Dashboard"
            ]),
            "Reusable UI Components",
            "State Management",
            "API Integration\n(Axios / Fetch)",
            "Routing\n(Next.js Router)",
            "Responsive UI Handling",
        ]
    },
    {
        "label": "Backend\n(Feathers.js)",
        "fill": "#2E7D32", "stroke": "#1B5E20", "light": "#C8E6C9",
        "children": [
            ("Services", [
                "Users", "Doctors", "Patients", "Appointments", "Slots",
                "Prescriptions", "Messages", "Reviews", "Analytics", "Authentication"
            ]),
            "Middleware",
            "Hooks",
            "Validation Logic",
            "Service-Based\nArchitecture",
        ]
    },
    {
        "label": "Database\n(MongoDB)",
        "fill": "#E65100", "stroke": "#BF360C", "light": "#FFE0B2",
        "children": [
            ("Collections", [
                "Users", "Doctors", "Patients", "Appointments", "Slots",
                "Prescriptions", "Messages", "Reviews",
                "Password Reset\nTokens", "Analytics Data"
            ]),
            ("Relationships", [
                "Doctor → Appointments",
                "Patient → Appointments",
                "Appointment → Prescription",
                "Doctor → Reviews"
            ]),
        ]
    },
    {
        "label": "Doctor\nModule",
        "fill": "#00838F", "stroke": "#006064", "light": "#B2EBF2",
        "children": [
            "Profile Management",
            "Clinic Details\n(Name, Locality, City, Pincode)",
            "Qualifications",
            "Languages Spoken",
            "Consultation Fee",
            "Slot Management",
            "Appointment Handling",
            "Prescriptions",
            "Ratings Visibility",
        ]
    },
    {
        "label": "Patient\nModule",
        "fill": "#F9A825", "stroke": "#F57F17", "light": "#FFF9C4",
        "children": [
            "Doctor Search",
            "Booking Appointments",
            "Messaging with Doctors",
            "Viewing Prescriptions",
            "Health Insights",
            "Appointment History",
            "Profile Management",
        ]
    },
]

RIGHT_BRANCHES = [
    {
        "label": "Authentication\nSystem",
        "fill": "#C62828", "stroke": "#B71C1C", "light": "#FFCDD2",
        "children": [
            "Login",
            "Signup",
            ("Role-Based Access", ["Admin", "Doctor", "Patient"]),
            "JWT / Token Handling",
            "localStorage Usage",
            "Password Reset Flow\n(Token + Expiry)",
            ("Account Status", ["Active", "Suspended", "Pending Approval"]),
        ]
    },
    {
        "label": "Appointment\nSystem",
        "fill": "#6A1B9A", "stroke": "#4A148C", "light": "#E1BEE7",
        "children": [
            "Booking Flow",
            "Slot Creation\nby Doctors",
            "Slot Availability",
            ("Appointment Status", [
                "Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled"
            ]),
            "Rescheduling\nFunctionality",
        ]
    },
    {
        "label": "Admin\nModule",
        "fill": "#AD1457", "stroke": "#880E4F", "light": "#F8BBD0",
        "children": [
            "Doctor Approval System",
            "Patient & Doctor\nManagement",
            "Appointment Monitoring",
            "Analytics Dashboard",
            "Account Suspension",
            "Deletion Handling",
        ]
    },
    {
        "label": "Messaging\nSystem",
        "fill": "#4527A0", "stroke": "#311B92", "light": "#D1C4E9",
        "children": [
            "Doctor-Patient\nCommunication",
            "Message Storage",
            "Conversation Filtering\n(Based on Appointments)",
            "Database Structure",
        ]
    },
    {
        "label": "Prescription\nSystem",
        "fill": "#00695C", "stroke": "#004D40", "light": "#B2DFDB",
        "children": [
            "Creation by Doctor",
            "Linking with\nAppointment",
            "Viewing by Patient",
        ]
    },
    {
        "label": "Ratings &\nReviews",
        "fill": "#D84315", "stroke": "#BF360C", "light": "#FFCCBC",
        "children": [
            "Patient Feedback",
            "Rating Storage",
            "Average Rating\nCalculation",
            "Display on\nDoctor Profiles",
        ]
    },
    {
        "label": "Analytics &\nReports",
        "fill": "#283593", "stroke": "#1A237E", "light": "#C5CAE9",
        "children": [
            "Total Revenue",
            "Appointment Trends",
            "Completion Rate",
            "Patient Satisfaction",
            "Top Doctors",
            "Revenue Breakdown\n(Real-time Aggregation)",
        ]
    },
    {
        "label": "Email System\n(Nodemailer)",
        "fill": "#558B2F", "stroke": "#33691E", "light": "#DCEDC8",
        "children": [
            "Nodemailer Integration",
            "Appointment Booked\nEmail",
            "Appointment Confirmed\nEmail",
            "Password Reset Email",
        ]
    },
    {
        "label": "Search &\nFilters",
        "fill": "#0277BD", "stroke": "#01579B", "light": "#B3E5FC",
        "children": [
            "Doctor Name",
            "Specialization",
            "City",
            "Locality",
            "Pincode",
        ]
    },
    {
        "label": "Security &\nValidation",
        "fill": "#4E342E", "stroke": "#3E2723", "light": "#D7CCC8",
        "children": [
            "Input Validation",
            "API Validation",
            "Role-Based\nAccess Control",
            "Token Validation",
            "Secure Password\nHandling",
        ]
    },
]

# --- Layout Constants ---
CENTER_X, CENTER_Y = 3000, 2200
CENTER_W, CENTER_H = 340, 90
L1_W, L1_H = 200, 52
L2_W, L2_H = 195, 40
L3_W, L3_H = 175, 34
LEAF_SPACING = 48
BRANCH_GAP = 90
L1_X_OFFSET = 550
L2_X_OFFSET = 500
L3_X_OFFSET = 450

# --- Helper: count leaf nodes in a branch ---
def count_leaves(children):
    total = 0
    for c in children:
        if isinstance(c, str):
            total += 1
        else:
            total += count_leaves(c[1])
    return total

# --- Helper: compute Y extent of a branch ---
def branch_height(children):
    leaves = count_leaves(children)
    return leaves * LEAF_SPACING

# --- XML Builder ---
cell_id = 2
cells = []

def new_id():
    global cell_id
    cell_id += 1
    return str(cell_id)

def add_node(x, y, w, h, label, style):
    nid = new_id()
    cells.append(("node", nid, x, y, w, h, label, style))
    return nid

def add_edge(source, target, color, width=2):
    eid = new_id()
    style = f"curved=1;endArrow=none;html=1;strokeWidth={width};strokeColor={color};rounded=1;"
    cells.append(("edge", eid, source, target, style))
    return eid

# --- Styles ---
def center_style():
    return "shape=ellipse;whiteSpace=wrap;html=1;fillColor=#1A237E;fontColor=#FFFFFF;fontSize=17;fontStyle=1;shadow=1;strokeColor=#0D47A1;strokeWidth=3;gradientColor=#283593;gradientDirection=south;"

def l1_style(fill, stroke):
    return f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};fontColor=#FFFFFF;fontSize=12;fontStyle=1;arcSize=40;shadow=1;strokeColor={stroke};strokeWidth=2;"

def l2_style(light, stroke):
    return f"rounded=1;whiteSpace=wrap;html=1;fillColor={light};fontColor=#333333;fontSize=10;arcSize=25;strokeColor={stroke};strokeWidth=1;"

def l3_style():
    return "rounded=1;whiteSpace=wrap;html=1;fillColor=#FAFAFA;fontColor=#555555;fontSize=9;arcSize=20;strokeColor=#BDBDBD;strokeWidth=0.5;"

# --- Place center node ---
center_id = "2"
cells.append(("node", center_id, CENTER_X - CENTER_W//2, CENTER_Y - CENTER_H//2, CENTER_W, CENTER_H, "EasyAppointment\nSystem", center_style()))

# --- Recursive placement ---
def place_children(children, base_y, x_l2, x_l3, direction, branch_color, light_fill, stroke_color):
    """Place children nodes. Returns list of (id, center_y) and next_y."""
    results = []
    cur_y = base_y
    for c in children:
        if isinstance(c, str):
            # Leaf at L2 level
            nid = add_node(x_l2, cur_y, L2_W, L2_H, c, l2_style(light_fill, stroke_color))
            results.append((nid, cur_y + L2_H // 2))
            cur_y += LEAF_SPACING
        else:
            label, sub_children = c
            # Place sub-children first to know vertical extent
            sub_start_y = cur_y
            sub_results = []
            sub_y = cur_y
            for sc in sub_children:
                sid = add_node(x_l3, sub_y, L3_W, L3_H, sc, l3_style())
                sub_results.append((sid, sub_y + L3_H // 2))
                sub_y += LEAF_SPACING
            # Parent L2 node centered on its children
            if sub_results:
                mid_y = (sub_results[0][1] + sub_results[-1][1]) // 2 - L2_H // 2
            else:
                mid_y = cur_y
            nid = add_node(x_l2, mid_y, L2_W, L2_H, label, l2_style(light_fill, stroke_color))
            # Edges from L2 to L3
            for sid, _ in sub_results:
                add_edge(nid, sid, stroke_color, 1.5)
            results.append((nid, mid_y + L2_H // 2))
            cur_y = sub_y
    return results, cur_y

# --- Place left branches ---
def compute_branch_starts(branches, start_y):
    positions = []
    y = start_y
    for b in branches:
        h = branch_height(b["children"])
        positions.append((y, h))
        y += h + BRANCH_GAP
    return positions

left_positions = compute_branch_starts(LEFT_BRANCHES, 100)
total_left_h = left_positions[-1][0] + left_positions[-1][1] - left_positions[0][0]
# Shift to center vertically around CENTER_Y
left_offset = CENTER_Y - (left_positions[0][0] + total_left_h // 2)

for i, branch in enumerate(LEFT_BRANCHES):
    base_y = left_positions[i][0] + left_offset
    x_l1 = CENTER_X - CENTER_W//2 - L1_X_OFFSET - L1_W
    x_l2 = x_l1 - L2_X_OFFSET - L2_W
    x_l3 = x_l2 - L3_X_OFFSET - L3_W

    child_results, end_y = place_children(
        branch["children"], base_y, x_l2, x_l3, "left",
        branch["fill"], branch["light"], branch["stroke"]
    )

    if child_results:
        mid = (child_results[0][1] + child_results[-1][1]) // 2 - L1_H // 2
    else:
        mid = base_y
    l1_id = add_node(x_l1, mid, L1_W, L1_H, branch["label"], l1_style(branch["fill"], branch["stroke"]))

    # Edge: center → L1
    add_edge(center_id, l1_id, branch["fill"], 2.5)
    # Edges: L1 → L2
    for cid, _ in child_results:
        add_edge(l1_id, cid, branch["stroke"], 1.5)

# --- Place right branches ---
right_positions = compute_branch_starts(RIGHT_BRANCHES, 100)
total_right_h = right_positions[-1][0] + right_positions[-1][1] - right_positions[0][0]
right_offset = CENTER_Y - (right_positions[0][0] + total_right_h // 2)

for i, branch in enumerate(RIGHT_BRANCHES):
    base_y = right_positions[i][0] + right_offset
    x_l1 = CENTER_X + CENTER_W//2 + L1_X_OFFSET
    x_l2 = x_l1 + L1_W + L2_X_OFFSET
    x_l3 = x_l2 + L2_W + L3_X_OFFSET

    child_results, end_y = place_children(
        branch["children"], base_y, x_l2, x_l3, "right",
        branch["fill"], branch["light"], branch["stroke"]
    )

    if child_results:
        mid = (child_results[0][1] + child_results[-1][1]) // 2 - L1_H // 2
    else:
        mid = base_y
    l1_id = add_node(x_l1, mid, L1_W, L1_H, branch["label"], l1_style(branch["fill"], branch["stroke"]))

    add_edge(center_id, l1_id, branch["fill"], 2.5)
    for cid, _ in child_results:
        add_edge(l1_id, cid, branch["stroke"], 1.5)

# --- Build XML ---
mxfile = ET.Element("mxfile", host="app.diagrams.net", modified="2026-04-03T10:44:00.000Z",
                     agent="EasyAppointment MindMap Generator", type="device")
diagram = ET.SubElement(mxfile, "diagram", id="mindmap1", name="EasyAppointment Mind Map")
model = ET.SubElement(diagram, "mxGraphModel", dx="1800", dy="1000", grid="1", gridSize="10",
                       guides="1", tooltips="1", connect="1", arrows="1", fold="1", page="0",
                       pageScale="1", pageWidth="8000", pageHeight="6000", math="0", shadow="0")
root = ET.SubElement(model, "root")
ET.SubElement(root, "mxCell", id="0")
ET.SubElement(root, "mxCell", id="1", parent="0")

for cell in cells:
    if cell[0] == "node":
        _, cid, x, y, w, h, label, style = cell
        el = ET.SubElement(root, "mxCell", id=str(cid), value=label, style=style,
                           vertex="1", parent="1")
        ET.SubElement(el, "mxGeometry", x=str(x), y=str(y), width=str(w), height=str(h)).set("as", "geometry")
    elif cell[0] == "edge":
        _, eid, source, target, style = cell
        edge_el = ET.SubElement(root, "mxCell", id=str(eid), style=style,
                      edge="1", source=str(source), target=str(target), parent="1")
        geo = ET.SubElement(edge_el, "mxGeometry")
        geo.set("relative", "1")
        geo.set("as", "geometry")

# --- Write file ---
xml_str = ET.tostring(mxfile, encoding="unicode")
# Pretty print
dom = minidom.parseString(xml_str)
pretty = dom.toprettyxml(indent="  ", encoding=None)
# Remove extra xml declaration
lines = pretty.split("\n")
if lines[0].startswith("<?xml"):
    lines = lines[1:]
output = "\n".join(lines)

output_path = r"d:\VAST\MERN-Stack-Training\FULL-STACK-PROJECT\EasyAppointment-Full-Stack_Doctor_Appointment_Booking_System\EasyAppointment_MindMap.drawio"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(output)

print(f"Mind map generated: {output_path}")
print(f"Total cells: {len(cells)}")
