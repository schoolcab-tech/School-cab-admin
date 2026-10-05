
alter table public.ev_charging_points
  add column if not exists service_areas text[] not null default '{}';

update public.ev_charging_points set
    service_areas = ARRAY['Pragati Maidan', 'Mandi House', 'ITO', 'Connaught Place', 'Daryaganj', 'Nizamuddin', 'Lodhi Road', 'Jangpura', 'Kotla Mubarakpur', 'Bhogal', 'Paharganj', 'Chandni Chowk', 'Sadar Bazaar', 'Rajinder Nagar', 'Rajendra Place']
    
  where source_id = 'station_1';
update public.ev_charging_points set
    service_areas = ARRAY['Greater Noida Gamma', 'Greater Noida Beta', 'Greater Noida Pari Chowk', 'Greater Noida Alpha', 'Greater Noida Knowledge Park', 'Jaypee Greens Greater Noida']
    
  where source_id = 'station_2';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_3';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 12', 'Noida Sector 16', 'Noida Sector 15', 'Noida Sector 22', 'Noida Sector 10', 'Noida Sector 55', 'Noida Sector 6', 'Mayur Vihar Phase 3', 'Noida Sector 20', 'Noida Sector 56', 'Noida Sector 29', 'Noida Sector 54', 'Noida Sector 31', 'Noida Sector 19', 'Noida Sector 53']
    
  where source_id = 'station_4';
update public.ev_charging_points set
    service_areas = ARRAY['RK Puram', 'Vasant Vihar', 'Moti Bagh', 'Chanakyapuri', 'Panchsheel Enclave', 'Safdarjung Enclave', 'Sarojini Nagar', 'Green Park', 'Vasant Kunj', 'Mehrauli', 'Mahipalpur', 'Rangpuri', 'Samalka', 'Udyog Vihar Gurgaon', 'DLF Phase 3 Gurgaon']
    
  where source_id = 'station_6';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_7';
update public.ev_charging_points set
    service_areas = ARRAY['Purkazi', 'Muzaffarnagar city', 'Khatauli', 'Jansath', 'Mansurpur', 'Shahpur', 'Bhopa', 'Miranpur', 'Charthawal', 'Titawi', 'Roorkee (nearby town)']
    
  where source_id = 'station_8';
update public.ev_charging_points set
    service_areas = ARRAY['Vasundhara Enclave', 'Mayur Vihar Phase 2']
    
  where source_id = 'station_9';
update public.ev_charging_points set
    service_areas = ARRAY['Pilkhuwa', 'Modinagar']
    
  where source_id = 'station_10';
update public.ev_charging_points set
    service_areas = ARRAY['Greater Kailash 2', 'Chittaranjan Park', 'Nehru Place', 'Alaknanda', 'Kalkaji', 'Ambedkar Nagar', 'Govindpuri', 'East of Kailash', 'Okhla', 'Lajpat Nagar', 'Tughlakabad', 'Badarpur', 'Defence Colony', 'South Extension', 'Ashram']
    
  where source_id = 'station_11';
update public.ev_charging_points set
    service_areas = ARRAY['Sonipat City', 'Rai', 'Kundli', 'Narela']
    
  where source_id = 'station_12';
update public.ev_charging_points set
    service_areas = ARRAY['Hapur town', 'Pilkhuwa', 'Garhmukteshwar', 'Simbhaoli', 'Dhaulana', 'Brijghat', 'Syana']
    
  where source_id = 'station_13';
update public.ev_charging_points set
    service_areas = ARRAY['Vasundhara Enclave', 'Mayur Vihar Phase 2', 'Mayur Vihar Phase 3']
    
  where source_id = 'station_14';
update public.ev_charging_points set
    service_areas = ARRAY['Dwarka Sector 9', 'Dwarka Sector 8', 'Dwarka Sector 7', 'Dwarka Sector 4', 'Dwarka Sector 1', 'Dwarka Sector 6', 'Dwarka Sector 19', 'Dwarka Sector 22', 'Bijwasan', 'Najafgarh', 'Dwarka Sector 11', 'Dwarka Sector 14', 'Dwarka Sector 13', 'Bindapur', 'Matiala']
    
  where source_id = 'station_15';
update public.ev_charging_points set
    service_areas = ARRAY['Dwarka Sector 11', 'Dwarka Sector 13', 'Dwarka Sector 14', 'Bindapur', 'Matiala', 'Dabri', 'Uttam Nagar', 'Dwarka Mor', 'Palam', 'Janakpuri', 'Vikaspuri', 'Tilak Nagar', 'Hari Nagar', 'Dwarka Sector 9', 'Dwarka Sector 7']
    
  where source_id = 'station_16';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_18';
update public.ev_charging_points set
    service_areas = ARRAY['Samalka', 'Vasant Kunj', 'Rangpuri', 'DLF Phase 3 Gurgaon', 'Mahipalpur', 'Cyber City Gurgaon', 'Udyog Vihar Gurgaon', 'Kapashera', 'DLF Phase 1 Gurgaon', 'DLF Phase 2 Gurgaon', 'IGI Airport', 'DLF Phase 4 Gurgaon', 'MG Road Gurgaon', 'Sushant Lok Gurgaon', 'DLF Phase 5 Gurgaon']
    
  where source_id = 'station_19';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 63', 'Indirapuram', 'Noida Sector 59', 'Vaishali Ghaziabad', 'Vasundhara Ghaziabad', 'Crossings Republik', 'Noida Extension (Greater Noida West)', 'Noida Sector 60', 'Noida Sector 61', 'Noida Sector 73', 'Noida Sector 72', 'Sahibabad', 'Noida Sector 74', 'Noida Sector 70', 'Noida Sector 75']
    
  where source_id = 'station_20';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 47', 'Noida Sector 48', 'Noida Sector 45', 'Noida Sector 37', 'Noida Sector 50', 'Noida Sector 51', 'Noida Sector 49', 'Noida Sector 34', 'Noida Sector 26', 'Botanical Garden Noida', 'Noida Sector 39', 'Noida Sector 27', 'Noida Sector 100', 'Noida Sector 52', 'Noida Sector 70']
    
  where source_id = 'station_21';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_22';
update public.ev_charging_points set
    service_areas = ARRAY['Garhmukteshwar town', 'Brijghat', 'Simbhaoli', 'Dhaulana', 'Bhojpur', 'Hapur town']
    
  where source_id = 'station_23';
update public.ev_charging_points set
    service_areas = ARRAY['Muzaffarnagar city', 'Shahpur', 'Jansath', 'Khatauli', 'Titawi', 'Charthawal', 'Baghra', 'Budhana', 'Kandhla', 'Shamli']
    
  where source_id = 'station_24';
update public.ev_charging_points set
    service_areas = ARRAY['Pataudi', 'Manesar', 'Farrukhnagar', 'Sohna']
    
  where source_id = 'station_25';
update public.ev_charging_points set
    service_areas = ARRAY['Preet Vihar', 'Shakarpur', 'Anand Vihar', 'Kaushambi', 'Patparganj', 'Vaishali Ghaziabad', 'Vivek Vihar', 'Dilshad Garden', 'Vasundhara Ghaziabad', 'Indirapuram']
    
  where source_id = 'station_26';
update public.ev_charging_points set
    service_areas = ARRAY['Nizamuddin', 'Lodhi Road', 'Jangpura', 'Bhogal', 'Kotla Mubarakpur', 'Ashram', 'Pragati Maidan', 'Mandi House', 'ITO']
    
  where source_id = 'station_27';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_29';
update public.ev_charging_points set
    service_areas = ARRAY['Rajinder Nagar', 'Rajendra Place', 'Paharganj', 'Patel Nagar', 'Sadar Bazaar', 'Kamla Nagar', 'Chandni Chowk', 'Kirti Nagar', 'Kashmere Gate', 'Civil Lines', 'Moti Nagar', 'Ashok Vihar', 'Wazirpur', 'GTB Nagar', 'Ramesh Nagar']
    
  where source_id = 'station_30';
update public.ev_charging_points set
    service_areas = ARRAY['Malviya Nagar', 'Sainik Farm', 'Mehrauli', 'Chattarpur', 'Panchsheel Park', 'Ambedkar Nagar', 'Greater Kailash 2', 'Alaknanda', 'Tughlakabad', 'Govindpuri', 'Okhla', 'DLF Phase 5 Gurgaon', 'Golf Course Road Gurgaon', 'Sector 56 Gurgaon', 'Sector 70 Gurgaon']
    
  where source_id = 'station_31';
update public.ev_charging_points set
    service_areas = ARRAY['Shahdara', 'Krishna Nagar', 'Nand Nagri', 'Yamuna Vihar', 'Vivek Vihar', 'Seelampur', 'Geeta Colony', 'Gokulpuri', 'Dilshad Garden', 'Bhajanpura', 'Karawal Nagar', 'Mohan Nagar', 'Sahibabad', 'Timarpur', 'Loni']
    
  where source_id = 'station_32';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_33';
update public.ev_charging_points set
    service_areas = ARRAY['Rohini Sector 11', 'Rohini Sector 3', 'Rohini Sector 7', 'Rohini Sector 15', 'Rohini Sector 9', 'Rohini Sector 8', 'Rohini Sector 16', 'Pitampura', 'Rohini Sector 24', 'Rohini Sector 18', 'Shalimar Bagh', 'Netaji Subhash Place', 'Shahbad Dairy', 'Jahangirpuri', 'Keshav Puram']
    
  where source_id = 'station_34';
update public.ev_charging_points set
    service_areas = ARRAY['Patparganj', 'IP Extension', 'Shakarpur', 'Preet Vihar', 'Anand Vihar', 'Kaushambi']
    , latitude = 28.6362, longitude = 77.2908, city = 'New Delhi', state = 'Delhi'
  where source_id = 'station_35';
update public.ev_charging_points set
    service_areas = ARRAY['Dwarka Sector 11', 'Dwarka Sector 13', 'Dwarka Sector 14', 'Bindapur', 'Matiala', 'Dabri', 'Uttam Nagar', 'Dwarka Mor', 'Palam', 'Janakpuri', 'Vikaspuri', 'Tilak Nagar', 'Hari Nagar', 'Dwarka Sector 9', 'Dwarka Sector 7']
    
  where source_id = 'station_36';
update public.ev_charging_points set
    service_areas = ARRAY['IP Extension', 'Krishna Nagar', 'Geeta Colony', 'Daryaganj', 'Seelampur', 'Shahdara', 'Kashmere Gate', 'Yamuna Vihar', 'Nand Nagri', 'Bhajanpura', 'Gokulpuri', 'Karawal Nagar', 'Loni']
    
  where source_id = 'station_37';
update public.ev_charging_points set
    service_areas = ARRAY['Old Faridabad', 'Sector 62 Faridabad', 'Sector 15 Faridabad', 'Sector 37 Faridabad', 'Sector 49 Faridabad', 'Sector 81 Faridabad', 'NIT Faridabad', 'Sector 86 Faridabad', 'Sector 21 Faridabad', 'Ballabgarh', 'Greater Faridabad']
    
  where source_id = 'station_38';
update public.ev_charging_points set
    service_areas = ARRAY['Green Park', 'Panchsheel Park', 'Panchsheel Enclave', 'Safdarjung Enclave', 'South Extension', 'Sarojini Nagar', 'Defence Colony', 'Malviya Nagar', 'RK Puram', 'Moti Bagh', 'Lajpat Nagar', 'East of Kailash', 'Nehru Place', 'Chittaranjan Park', 'Vasant Vihar']
    
  where source_id = 'station_39';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_41';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 119', 'Noida Sector 137', 'Noida Sector 117', 'Noida Sector 120', 'Noida Sector 142', 'Noida Sector 143', 'Noida Sector 116', 'Noida Sector 132', 'Noida Sector 110', 'Noida Sector 144', 'Noida Sector 128', 'Noida Sector 150', 'Noida Sector 93', 'Noida Sector 100', 'Noida Sector 78']
    
  where source_id = 'station_42';
update public.ev_charging_points set
    service_areas = ARRAY['Noida Sector 12', 'Noida Sector 22', 'Noida Sector 15', 'Noida Sector 31']
    
  where source_id = 'station_43';
update public.ev_charging_points set
    service_areas = ARRAY['Ghaziabad City Centre', 'Govindpuram', 'Vijay Nagar Ghaziabad', 'Modinagar', 'Crossings Republik', 'Pilkhuwa']
    
  where source_id = 'station_44';
