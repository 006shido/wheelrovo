import { Coordinate } from './stats';

export interface Task {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  completed: boolean;
  type: 'login' | 'distance' | 'speed' | 'duration' | 'safety' | 'smoothness';
  targetValue?: number; // e.g., 2 km, 120 seconds, or a 0-100 score threshold
}

export interface Milestone {
  level: number;
  title: string;
  xpRequired: number;
}

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Daily Check-in',
    description: 'Launch Wheelrovo today and check in',
    rewardXp: 15,
    completed: false,
    type: 'login',
  },
  {
    id: 'task-2',
    title: 'Short Commute',
    description: 'Drive a total of 1.5 km or more',
    rewardXp: 30,
    completed: false,
    type: 'distance',
    targetValue: 1.5,
  },
  {
    id: 'task-3',
    title: 'Eco Cruiser',
    description: 'Complete a trip with an average speed below 50 km/h',
    rewardXp: 25,
    completed: false,
    type: 'speed',
    targetValue: 50,
  },
  {
    id: 'task-4',
    title: 'Road Endurance',
    description: 'Track a single trip for more than 1 minute (60 seconds)',
    rewardXp: 20,
    completed: false,
    type: 'duration',
    targetValue: 60,
  },
  {
    id: 'task-5',
    title: 'Smooth Operator',
    description: 'Complete a trip with a smoothness score of 80 or higher',
    rewardXp: 30,
    completed: false,
    type: 'smoothness',
    targetValue: 80,
  },
  {
    id: 'task-6',
    title: 'Steady Hands',
    description: 'Complete a trip with a safety score of 85 or higher',
    rewardXp: 30,
    completed: false,
    type: 'safety',
    targetValue: 85,
  },
];

export const MILESTONES: Milestone[] = [
  { level: 1, title: 'Rookie Driver', xpRequired: 0 },
  { level: 2, title: 'Road Voyager', xpRequired: 50 },
  { level: 3, title: 'Highway Star', xpRequired: 150 },
  { level: 4, title: 'Asphalt Legend', xpRequired: 300 },
];

export interface IndianSimCity {
  id: string;
  name: string;
  state: string;
  landmark: string;
  center: { latitude: number; longitude: number };
  route: Omit<Coordinate, 'timestamp'>[];
}

export const INDIAN_SIMULATION_ROUTES: IndianSimCity[] = [
  {
    "id": "bengaluru",
    "name": "Bengaluru",
    "state": "Karnataka",
    "landmark": "MG Road & Brigade Rd",
    "center": {
      "latitude": 12.9766,
      "longitude": 77.5993
    },
    "route": [
      {
        "latitude": 12.976598,
        "longitude": 77.599301
      },
      {
        "latitude": 12.976693,
        "longitude": 77.599833
      },
      {
        "latitude": 12.97668,
        "longitude": 77.60026
      },
      {
        "latitude": 12.976672,
        "longitude": 77.600524
      },
      {
        "latitude": 12.976664,
        "longitude": 77.600754
      },
      {
        "latitude": 12.976652,
        "longitude": 77.60109
      },
      {
        "latitude": 12.976643,
        "longitude": 77.60132
      },
      {
        "latitude": 12.976634,
        "longitude": 77.601551
      },
      {
        "latitude": 12.977062,
        "longitude": 77.60186
      },
      {
        "latitude": 12.977352,
        "longitude": 77.601928
      },
      {
        "latitude": 12.977571,
        "longitude": 77.60198
      },
      {
        "latitude": 12.977935,
        "longitude": 77.602069
      },
      {
        "latitude": 12.978155,
        "longitude": 77.602124
      },
      {
        "latitude": 12.978374,
        "longitude": 77.602178
      },
      {
        "latitude": 12.978592,
        "longitude": 77.602233
      },
      {
        "latitude": 12.978811,
        "longitude": 77.602287
      },
      {
        "latitude": 12.979029,
        "longitude": 77.602342
      },
      {
        "latitude": 12.979194,
        "longitude": 77.602808
      },
      {
        "latitude": 12.979127,
        "longitude": 77.603029
      },
      {
        "latitude": 12.979061,
        "longitude": 77.603249
      },
      {
        "latitude": 12.978926,
        "longitude": 77.603672
      },
      {
        "latitude": 12.978826,
        "longitude": 77.603972
      },
      {
        "latitude": 12.978753,
        "longitude": 77.604191
      },
      {
        "latitude": 12.978641,
        "longitude": 77.604534
      },
      {
        "latitude": 12.97857,
        "longitude": 77.604753
      },
      {
        "latitude": 12.978436,
        "longitude": 77.605162
      },
      {
        "latitude": 12.978364,
        "longitude": 77.60538
      },
      {
        "latitude": 12.978263,
        "longitude": 77.605706
      },
      {
        "latitude": 12.978128,
        "longitude": 77.606122
      },
      {
        "latitude": 12.978052,
        "longitude": 77.60634
      },
      {
        "latitude": 12.977807,
        "longitude": 77.607067
      },
      {
        "latitude": 12.977734,
        "longitude": 77.607285
      },
      {
        "latitude": 12.97766,
        "longitude": 77.607503
      },
      {
        "latitude": 12.977458,
        "longitude": 77.608144
      },
      {
        "latitude": 12.977387,
        "longitude": 77.608363
      },
      {
        "latitude": 12.977316,
        "longitude": 77.608582
      },
      {
        "latitude": 12.976843,
        "longitude": 77.608679
      },
      {
        "latitude": 12.97663,
        "longitude": 77.608603
      },
      {
        "latitude": 12.976418,
        "longitude": 77.608527
      },
      {
        "latitude": 12.976206,
        "longitude": 77.608451
      },
      {
        "latitude": 12.975994,
        "longitude": 77.608375
      },
      {
        "latitude": 12.975576,
        "longitude": 77.608225
      },
      {
        "latitude": 12.975363,
        "longitude": 77.608149
      },
      {
        "latitude": 12.974741,
        "longitude": 77.607859
      },
      {
        "latitude": 12.974525,
        "longitude": 77.607793
      },
      {
        "latitude": 12.974401,
        "longitude": 77.607417
      },
      {
        "latitude": 12.974454,
        "longitude": 77.607193
      },
      {
        "latitude": 12.974507,
        "longitude": 77.606968
      },
      {
        "latitude": 12.974597,
        "longitude": 77.606589
      },
      {
        "latitude": 12.974995,
        "longitude": 77.604911
      },
      {
        "latitude": 12.975111,
        "longitude": 77.604445
      },
      {
        "latitude": 12.974851,
        "longitude": 77.604108
      },
      {
        "latitude": 12.97463,
        "longitude": 77.604066
      },
      {
        "latitude": 12.973551,
        "longitude": 77.604388
      },
      {
        "latitude": 12.973326,
        "longitude": 77.60439
      },
      {
        "latitude": 12.973444,
        "longitude": 77.604389
      },
      {
        "latitude": 12.973669,
        "longitude": 77.604388
      },
      {
        "latitude": 12.973711,
        "longitude": 77.60458
      },
      {
        "latitude": 12.973421,
        "longitude": 77.605028
      },
      {
        "latitude": 12.973294,
        "longitude": 77.605219
      },
      {
        "latitude": 12.973138,
        "longitude": 77.605397
      },
      {
        "latitude": 12.972988,
        "longitude": 77.605569
      },
      {
        "latitude": 12.972837,
        "longitude": 77.60574
      },
      {
        "latitude": 12.972585,
        "longitude": 77.605688
      },
      {
        "latitude": 12.972094,
        "longitude": 77.605147
      },
      {
        "latitude": 12.972004,
        "longitude": 77.604929
      },
      {
        "latitude": 12.971915,
        "longitude": 77.604717
      },
      {
        "latitude": 12.971827,
        "longitude": 77.604505
      },
      {
        "latitude": 12.9721,
        "longitude": 77.604309
      },
      {
        "latitude": 12.972879,
        "longitude": 77.603014
      },
      {
        "latitude": 12.972899,
        "longitude": 77.602777
      },
      {
        "latitude": 12.972924,
        "longitude": 77.60238
      },
      {
        "latitude": 12.972937,
        "longitude": 77.602149
      },
      {
        "latitude": 12.972957,
        "longitude": 77.601754
      },
      {
        "latitude": 12.972313,
        "longitude": 77.601163
      },
      {
        "latitude": 12.972027,
        "longitude": 77.601105
      },
      {
        "latitude": 12.971761,
        "longitude": 77.601049
      },
      {
        "latitude": 12.971098,
        "longitude": 77.600902
      },
      {
        "latitude": 12.970673,
        "longitude": 77.600816
      },
      {
        "latitude": 12.969973,
        "longitude": 77.600653
      },
      {
        "latitude": 12.969344,
        "longitude": 77.600507
      },
      {
        "latitude": 12.969259,
        "longitude": 77.600772
      },
      {
        "latitude": 12.969199,
        "longitude": 77.600995
      },
      {
        "latitude": 12.969205,
        "longitude": 77.60097
      },
      {
        "latitude": 12.969315,
        "longitude": 77.600565
      },
      {
        "latitude": 12.969049,
        "longitude": 77.600433
      },
      {
        "latitude": 12.968831,
        "longitude": 77.600377
      },
      {
        "latitude": 12.96843,
        "longitude": 77.60028
      },
      {
        "latitude": 12.968164,
        "longitude": 77.600635
      },
      {
        "latitude": 12.968283,
        "longitude": 77.600831
      },
      {
        "latitude": 12.968403,
        "longitude": 77.601026
      },
      {
        "latitude": 12.968583,
        "longitude": 77.601308
      },
      {
        "latitude": 12.968755,
        "longitude": 77.601555
      },
      {
        "latitude": 12.969288,
        "longitude": 77.602244
      },
      {
        "latitude": 12.969622,
        "longitude": 77.602667
      },
      {
        "latitude": 12.96976,
        "longitude": 77.602849
      },
      {
        "latitude": 12.969995,
        "longitude": 77.603175
      },
      {
        "latitude": 12.970125,
        "longitude": 77.603362
      },
      {
        "latitude": 12.970256,
        "longitude": 77.60355
      },
      {
        "latitude": 12.970473,
        "longitude": 77.603915
      },
      {
        "latitude": 12.970758,
        "longitude": 77.604496
      },
      {
        "latitude": 12.971194,
        "longitude": 77.604688
      },
      {
        "latitude": 12.971403,
        "longitude": 77.604602
      },
      {
        "latitude": 12.9721,
        "longitude": 77.604309
      },
      {
        "latitude": 12.972879,
        "longitude": 77.603014
      },
      {
        "latitude": 12.972899,
        "longitude": 77.602777
      },
      {
        "latitude": 12.972924,
        "longitude": 77.60238
      },
      {
        "latitude": 12.972937,
        "longitude": 77.602149
      },
      {
        "latitude": 12.972957,
        "longitude": 77.601754
      },
      {
        "latitude": 12.972313,
        "longitude": 77.601163
      },
      {
        "latitude": 12.972027,
        "longitude": 77.601105
      },
      {
        "latitude": 12.971761,
        "longitude": 77.601049
      },
      {
        "latitude": 12.971098,
        "longitude": 77.600902
      },
      {
        "latitude": 12.970673,
        "longitude": 77.600816
      },
      {
        "latitude": 12.970424,
        "longitude": 77.600439
      },
      {
        "latitude": 12.970566,
        "longitude": 77.59994
      },
      {
        "latitude": 12.97063,
        "longitude": 77.599718
      },
      {
        "latitude": 12.970693,
        "longitude": 77.599497
      },
      {
        "latitude": 12.970813,
        "longitude": 77.599077
      },
      {
        "latitude": 12.970877,
        "longitude": 77.598855
      },
      {
        "latitude": 12.97094,
        "longitude": 77.598634
      },
      {
        "latitude": 12.971012,
        "longitude": 77.598382
      },
      {
        "latitude": 12.971076,
        "longitude": 77.59816
      },
      {
        "latitude": 12.971129,
        "longitude": 77.597247
      },
      {
        "latitude": 12.971138,
        "longitude": 77.596935
      },
      {
        "latitude": 12.971329,
        "longitude": 77.595978
      },
      {
        "latitude": 12.971421,
        "longitude": 77.595763
      },
      {
        "latitude": 12.971511,
        "longitude": 77.595551
      },
      {
        "latitude": 12.971801,
        "longitude": 77.594828
      },
      {
        "latitude": 12.971996,
        "longitude": 77.594313
      },
      {
        "latitude": 12.972438,
        "longitude": 77.594209
      },
      {
        "latitude": 12.972634,
        "longitude": 77.594372
      },
      {
        "latitude": 12.972808,
        "longitude": 77.594518
      },
      {
        "latitude": 12.972982,
        "longitude": 77.594664
      },
      {
        "latitude": 12.97326,
        "longitude": 77.594894
      },
      {
        "latitude": 12.973436,
        "longitude": 77.595037
      },
      {
        "latitude": 12.973594,
        "longitude": 77.595209
      },
      {
        "latitude": 12.973874,
        "longitude": 77.595549
      },
      {
        "latitude": 12.97405,
        "longitude": 77.595757
      },
      {
        "latitude": 12.974213,
        "longitude": 77.595953
      },
      {
        "latitude": 12.97454,
        "longitude": 77.595691
      },
      {
        "latitude": 12.974824,
        "longitude": 77.595717
      },
      {
        "latitude": 12.974984,
        "longitude": 77.595879
      },
      {
        "latitude": 12.974931,
        "longitude": 77.59615
      },
      {
        "latitude": 12.974879,
        "longitude": 77.596762
      },
      {
        "latitude": 12.975275,
        "longitude": 77.597313
      },
      {
        "latitude": 12.975406,
        "longitude": 77.5975
      },
      {
        "latitude": 12.975567,
        "longitude": 77.597727
      },
      {
        "latitude": 12.9757,
        "longitude": 77.597913
      },
      {
        "latitude": 12.976075,
        "longitude": 77.598424
      },
      {
        "latitude": 12.976211,
        "longitude": 77.598608
      },
      {
        "latitude": 12.976444,
        "longitude": 77.5989
      },
      {
        "latitude": 12.976693,
        "longitude": 77.599833
      },
      {
        "latitude": 12.97668,
        "longitude": 77.60026
      },
      {
        "latitude": 12.976672,
        "longitude": 77.600524
      },
      {
        "latitude": 12.976664,
        "longitude": 77.600754
      },
      {
        "latitude": 12.976652,
        "longitude": 77.60109
      },
      {
        "latitude": 12.976643,
        "longitude": 77.60132
      },
      {
        "latitude": 12.976634,
        "longitude": 77.601551
      },
      {
        "latitude": 12.976528,
        "longitude": 77.601443
      },
      {
        "latitude": 12.976535,
        "longitude": 77.601213
      },
      {
        "latitude": 12.976567,
        "longitude": 77.600598
      },
      {
        "latitude": 12.976579,
        "longitude": 77.600308
      },
      {
        "latitude": 12.97659,
        "longitude": 77.600077
      },
      {
        "latitude": 12.976603,
        "longitude": 77.599778
      },
      {
        "latitude": 12.976614,
        "longitude": 77.599547
      }
    ]
  },
  {
    "id": "delhi",
    "name": "Delhi NCR",
    "state": "Delhi",
    "landmark": "Connaught Place & India Gate",
    "center": {
      "latitude": 28.6328,
      "longitude": 77.2197
    },
    "route": [
      {
        "latitude": 28.632502,
        "longitude": 77.220925
      },
      {
        "latitude": 28.632049,
        "longitude": 77.220974
      },
      {
        "latitude": 28.631744,
        "longitude": 77.221514
      },
      {
        "latitude": 28.631514,
        "longitude": 77.221925
      },
      {
        "latitude": 28.631394,
        "longitude": 77.222141
      },
      {
        "latitude": 28.631058,
        "longitude": 77.222304
      },
      {
        "latitude": 28.630657,
        "longitude": 77.221896
      },
      {
        "latitude": 28.62993,
        "longitude": 77.220282
      },
      {
        "latitude": 28.629893,
        "longitude": 77.21951
      },
      {
        "latitude": 28.629961,
        "longitude": 77.218992
      },
      {
        "latitude": 28.63003,
        "longitude": 77.218712
      },
      {
        "latitude": 28.630124,
        "longitude": 77.218443
      },
      {
        "latitude": 28.629819,
        "longitude": 77.21761
      },
      {
        "latitude": 28.629627,
        "longitude": 77.217475
      },
      {
        "latitude": 28.629436,
        "longitude": 77.217341
      },
      {
        "latitude": 28.629212,
        "longitude": 77.217485
      },
      {
        "latitude": 28.629089,
        "longitude": 77.217699
      },
      {
        "latitude": 28.628695,
        "longitude": 77.217817
      },
      {
        "latitude": 28.628398,
        "longitude": 77.21825
      },
      {
        "latitude": 28.628164,
        "longitude": 77.218408
      },
      {
        "latitude": 28.627939,
        "longitude": 77.218407
      },
      {
        "latitude": 28.627715,
        "longitude": 77.218406
      },
      {
        "latitude": 28.62749,
        "longitude": 77.218405
      },
      {
        "latitude": 28.627265,
        "longitude": 77.218404
      },
      {
        "latitude": 28.627162,
        "longitude": 77.218148
      },
      {
        "latitude": 28.627168,
        "longitude": 77.217892
      },
      {
        "latitude": 28.627175,
        "longitude": 77.217636
      },
      {
        "latitude": 28.626952,
        "longitude": 77.21756
      },
      {
        "latitude": 28.62658,
        "longitude": 77.217568
      },
      {
        "latitude": 28.626355,
        "longitude": 77.217574
      },
      {
        "latitude": 28.626301,
        "longitude": 77.21781
      },
      {
        "latitude": 28.626443,
        "longitude": 77.218524
      },
      {
        "latitude": 28.626443,
        "longitude": 77.21878
      },
      {
        "latitude": 28.625785,
        "longitude": 77.219311
      },
      {
        "latitude": 28.625561,
        "longitude": 77.219297
      },
      {
        "latitude": 28.625171,
        "longitude": 77.219273
      },
      {
        "latitude": 28.624947,
        "longitude": 77.21926
      },
      {
        "latitude": 28.624722,
        "longitude": 77.219246
      },
      {
        "latitude": 28.623877,
        "longitude": 77.219194
      },
      {
        "latitude": 28.623653,
        "longitude": 77.219181
      },
      {
        "latitude": 28.623428,
        "longitude": 77.219167
      },
      {
        "latitude": 28.623204,
        "longitude": 77.219153
      },
      {
        "latitude": 28.62289,
        "longitude": 77.219135
      },
      {
        "latitude": 28.622666,
        "longitude": 77.219121
      },
      {
        "latitude": 28.622239,
        "longitude": 77.219095
      },
      {
        "latitude": 28.621833,
        "longitude": 77.21907
      },
      {
        "latitude": 28.621609,
        "longitude": 77.219057
      },
      {
        "latitude": 28.621321,
        "longitude": 77.21904
      },
      {
        "latitude": 28.62106,
        "longitude": 77.219026
      },
      {
        "latitude": 28.620836,
        "longitude": 77.219013
      },
      {
        "latitude": 28.620495,
        "longitude": 77.218991
      },
      {
        "latitude": 28.619158,
        "longitude": 77.220197
      },
      {
        "latitude": 28.619034,
        "longitude": 77.22041
      },
      {
        "latitude": 28.618877,
        "longitude": 77.220681
      },
      {
        "latitude": 28.618746,
        "longitude": 77.220907
      },
      {
        "latitude": 28.618622,
        "longitude": 77.22112
      },
      {
        "latitude": 28.618386,
        "longitude": 77.221534
      },
      {
        "latitude": 28.618264,
        "longitude": 77.221749
      },
      {
        "latitude": 28.618138,
        "longitude": 77.221972
      },
      {
        "latitude": 28.617856,
        "longitude": 77.22246
      },
      {
        "latitude": 28.617531,
        "longitude": 77.223031
      },
      {
        "latitude": 28.617297,
        "longitude": 77.223441
      },
      {
        "latitude": 28.617091,
        "longitude": 77.223795
      },
      {
        "latitude": 28.6169,
        "longitude": 77.224131
      },
      {
        "latitude": 28.616778,
        "longitude": 77.224346
      },
      {
        "latitude": 28.615697,
        "longitude": 77.225006
      },
      {
        "latitude": 28.61533,
        "longitude": 77.224983
      },
      {
        "latitude": 28.615012,
        "longitude": 77.224963
      },
      {
        "latitude": 28.614788,
        "longitude": 77.224949
      },
      {
        "latitude": 28.614238,
        "longitude": 77.224915
      },
      {
        "latitude": 28.613917,
        "longitude": 77.224896
      },
      {
        "latitude": 28.613693,
        "longitude": 77.224882
      },
      {
        "latitude": 28.61341,
        "longitude": 77.224866
      },
      {
        "latitude": 28.612834,
        "longitude": 77.224829
      },
      {
        "latitude": 28.612279,
        "longitude": 77.224795
      },
      {
        "latitude": 28.611868,
        "longitude": 77.22477
      },
      {
        "latitude": 28.61148,
        "longitude": 77.224746
      },
      {
        "latitude": 28.611256,
        "longitude": 77.224733
      },
      {
        "latitude": 28.610875,
        "longitude": 77.224709
      },
      {
        "latitude": 28.610651,
        "longitude": 77.224695
      },
      {
        "latitude": 28.610294,
        "longitude": 77.22529
      },
      {
        "latitude": 28.610396,
        "longitude": 77.225518
      },
      {
        "latitude": 28.610499,
        "longitude": 77.225746
      },
      {
        "latitude": 28.610601,
        "longitude": 77.225974
      },
      {
        "latitude": 28.610704,
        "longitude": 77.226201
      },
      {
        "latitude": 28.610806,
        "longitude": 77.226429
      },
      {
        "latitude": 28.610909,
        "longitude": 77.226657
      },
      {
        "latitude": 28.611012,
        "longitude": 77.226885
      },
      {
        "latitude": 28.611192,
        "longitude": 77.227226
      },
      {
        "latitude": 28.611659,
        "longitude": 77.227589
      },
      {
        "latitude": 28.611906,
        "longitude": 77.227612
      },
      {
        "latitude": 28.61213,
        "longitude": 77.227623
      },
      {
        "latitude": 28.612355,
        "longitude": 77.227634
      },
      {
        "latitude": 28.612579,
        "longitude": 77.227645
      },
      {
        "latitude": 28.612804,
        "longitude": 77.227656
      },
      {
        "latitude": 28.613448,
        "longitude": 77.227701
      },
      {
        "latitude": 28.613672,
        "longitude": 77.22772
      },
      {
        "latitude": 28.613896,
        "longitude": 77.22774
      },
      {
        "latitude": 28.614281,
        "longitude": 77.227823
      },
      {
        "latitude": 28.614498,
        "longitude": 77.22789
      },
      {
        "latitude": 28.614758,
        "longitude": 77.228049
      },
      {
        "latitude": 28.614913,
        "longitude": 77.228278
      },
      {
        "latitude": 28.615079,
        "longitude": 77.228606
      },
      {
        "latitude": 28.615183,
        "longitude": 77.228833
      },
      {
        "latitude": 28.615287,
        "longitude": 77.22906
      },
      {
        "latitude": 28.615408,
        "longitude": 77.229324
      },
      {
        "latitude": 28.615707,
        "longitude": 77.22942
      },
      {
        "latitude": 28.615906,
        "longitude": 77.229303
      },
      {
        "latitude": 28.616106,
        "longitude": 77.229185
      },
      {
        "latitude": 28.616306,
        "longitude": 77.229068
      },
      {
        "latitude": 28.616506,
        "longitude": 77.22895
      },
      {
        "latitude": 28.616705,
        "longitude": 77.228832
      },
      {
        "latitude": 28.616952,
        "longitude": 77.228687
      },
      {
        "latitude": 28.617151,
        "longitude": 77.22857
      },
      {
        "latitude": 28.617351,
        "longitude": 77.228452
      },
      {
        "latitude": 28.617551,
        "longitude": 77.228334
      },
      {
        "latitude": 28.617751,
        "longitude": 77.228217
      },
      {
        "latitude": 28.617974,
        "longitude": 77.228085
      },
      {
        "latitude": 28.618174,
        "longitude": 77.227968
      },
      {
        "latitude": 28.618373,
        "longitude": 77.22785
      },
      {
        "latitude": 28.618628,
        "longitude": 77.227696
      },
      {
        "latitude": 28.618827,
        "longitude": 77.227576
      },
      {
        "latitude": 28.619287,
        "longitude": 77.227306
      },
      {
        "latitude": 28.620388,
        "longitude": 77.226749
      },
      {
        "latitude": 28.62059,
        "longitude": 77.226636
      },
      {
        "latitude": 28.620831,
        "longitude": 77.226501
      },
      {
        "latitude": 28.621032,
        "longitude": 77.226388
      },
      {
        "latitude": 28.621352,
        "longitude": 77.226207
      },
      {
        "latitude": 28.621554,
        "longitude": 77.226093
      },
      {
        "latitude": 28.621755,
        "longitude": 77.225979
      },
      {
        "latitude": 28.621956,
        "longitude": 77.225864
      },
      {
        "latitude": 28.622279,
        "longitude": 77.225667
      },
      {
        "latitude": 28.622477,
        "longitude": 77.225545
      },
      {
        "latitude": 28.622681,
        "longitude": 77.225418
      },
      {
        "latitude": 28.623223,
        "longitude": 77.225118
      },
      {
        "latitude": 28.623765,
        "longitude": 77.224815
      },
      {
        "latitude": 28.624117,
        "longitude": 77.224612
      },
      {
        "latitude": 28.6245,
        "longitude": 77.224393
      },
      {
        "latitude": 28.62507,
        "longitude": 77.225042
      },
      {
        "latitude": 28.625171,
        "longitude": 77.225842
      },
      {
        "latitude": 28.62515,
        "longitude": 77.225572
      },
      {
        "latitude": 28.624995,
        "longitude": 77.22487
      },
      {
        "latitude": 28.625049,
        "longitude": 77.22408
      },
      {
        "latitude": 28.625251,
        "longitude": 77.223967
      },
      {
        "latitude": 28.625452,
        "longitude": 77.223853
      },
      {
        "latitude": 28.625654,
        "longitude": 77.223739
      },
      {
        "latitude": 28.625855,
        "longitude": 77.223626
      },
      {
        "latitude": 28.626191,
        "longitude": 77.223442
      },
      {
        "latitude": 28.626669,
        "longitude": 77.223183
      },
      {
        "latitude": 28.626891,
        "longitude": 77.223056
      },
      {
        "latitude": 28.6273,
        "longitude": 77.222823
      },
      {
        "latitude": 28.62762,
        "longitude": 77.22264
      },
      {
        "latitude": 28.628058,
        "longitude": 77.22239
      },
      {
        "latitude": 28.628363,
        "longitude": 77.222216
      },
      {
        "latitude": 28.628816,
        "longitude": 77.221958
      },
      {
        "latitude": 28.629169,
        "longitude": 77.221756
      },
      {
        "latitude": 28.629529,
        "longitude": 77.221549
      },
      {
        "latitude": 28.62973,
        "longitude": 77.221433
      },
      {
        "latitude": 28.62993,
        "longitude": 77.220282
      },
      {
        "latitude": 28.629893,
        "longitude": 77.21951
      },
      {
        "latitude": 28.63046,
        "longitude": 77.219518
      },
      {
        "latitude": 28.631514,
        "longitude": 77.221925
      },
      {
        "latitude": 28.631394,
        "longitude": 77.222141
      },
      {
        "latitude": 28.63113,
        "longitude": 77.222649
      },
      {
        "latitude": 28.630951,
        "longitude": 77.222959
      },
      {
        "latitude": 28.630827,
        "longitude": 77.223173
      },
      {
        "latitude": 28.63017,
        "longitude": 77.2245
      },
      {
        "latitude": 28.629884,
        "longitude": 77.225002
      },
      {
        "latitude": 28.629669,
        "longitude": 77.225384
      },
      {
        "latitude": 28.629498,
        "longitude": 77.225688
      },
      {
        "latitude": 28.629164,
        "longitude": 77.226062
      },
      {
        "latitude": 28.62902,
        "longitude": 77.226289
      },
      {
        "latitude": 28.629145,
        "longitude": 77.225923
      },
      {
        "latitude": 28.629342,
        "longitude": 77.225579
      },
      {
        "latitude": 28.629463,
        "longitude": 77.225363
      },
      {
        "latitude": 28.629584,
        "longitude": 77.225147
      },
      {
        "latitude": 28.629714,
        "longitude": 77.224925
      },
      {
        "latitude": 28.629839,
        "longitude": 77.224713
      },
      {
        "latitude": 28.629965,
        "longitude": 77.2245
      },
      {
        "latitude": 28.63009,
        "longitude": 77.224287
      },
      {
        "latitude": 28.630215,
        "longitude": 77.224074
      },
      {
        "latitude": 28.630608,
        "longitude": 77.22339
      },
      {
        "latitude": 28.63081,
        "longitude": 77.223042
      },
      {
        "latitude": 28.630935,
        "longitude": 77.222829
      },
      {
        "latitude": 28.630657,
        "longitude": 77.221896
      },
      {
        "latitude": 28.62993,
        "longitude": 77.220282
      },
      {
        "latitude": 28.629893,
        "longitude": 77.21951
      },
      {
        "latitude": 28.63046,
        "longitude": 77.219518
      },
      {
        "latitude": 28.630918,
        "longitude": 77.219545
      },
      {
        "latitude": 28.631866,
        "longitude": 77.21898
      },
      {
        "latitude": 28.633579,
        "longitude": 77.218778
      },
      {
        "latitude": 28.633742,
        "longitude": 77.218997
      }
    ]
  },
  {
    "id": "mumbai",
    "name": "Mumbai",
    "state": "Maharashtra",
    "landmark": "Marine Drive & Chowpatty",
    "center": {
      "latitude": 18.9256,
      "longitude": 72.8236
    },
    "route": [
      {
        "latitude": 18.925616,
        "longitude": 72.823607
      },
      {
        "latitude": 18.925698,
        "longitude": 72.823386
      },
      {
        "latitude": 18.925648,
        "longitude": 72.822945
      },
      {
        "latitude": 18.925161,
        "longitude": 72.822585
      },
      {
        "latitude": 18.925132,
        "longitude": 72.822001
      },
      {
        "latitude": 18.925273,
        "longitude": 72.821817
      },
      {
        "latitude": 18.925565,
        "longitude": 72.821438
      },
      {
        "latitude": 18.925706,
        "longitude": 72.821254
      },
      {
        "latitude": 18.925952,
        "longitude": 72.820933
      },
      {
        "latitude": 18.92613,
        "longitude": 72.820702
      },
      {
        "latitude": 18.926411,
        "longitude": 72.820336
      },
      {
        "latitude": 18.926552,
        "longitude": 72.820152
      },
      {
        "latitude": 18.926694,
        "longitude": 72.819967
      },
      {
        "latitude": 18.926835,
        "longitude": 72.819782
      },
      {
        "latitude": 18.927203,
        "longitude": 72.819876
      },
      {
        "latitude": 18.927377,
        "longitude": 72.820026
      },
      {
        "latitude": 18.927551,
        "longitude": 72.820177
      },
      {
        "latitude": 18.927725,
        "longitude": 72.820328
      },
      {
        "latitude": 18.927898,
        "longitude": 72.820478
      },
      {
        "latitude": 18.928237,
        "longitude": 72.820772
      },
      {
        "latitude": 18.928411,
        "longitude": 72.820922
      },
      {
        "latitude": 18.928677,
        "longitude": 72.821119
      },
      {
        "latitude": 18.928882,
        "longitude": 72.821262
      },
      {
        "latitude": 18.92907,
        "longitude": 72.821392
      },
      {
        "latitude": 18.929257,
        "longitude": 72.821523
      },
      {
        "latitude": 18.929846,
        "longitude": 72.821903
      },
      {
        "latitude": 18.930042,
        "longitude": 72.82202
      },
      {
        "latitude": 18.930238,
        "longitude": 72.822136
      },
      {
        "latitude": 18.930617,
        "longitude": 72.82235
      },
      {
        "latitude": 18.930817,
        "longitude": 72.822458
      },
      {
        "latitude": 18.931159,
        "longitude": 72.822629
      },
      {
        "latitude": 18.931422,
        "longitude": 72.822755
      },
      {
        "latitude": 18.932049,
        "longitude": 72.823044
      },
      {
        "latitude": 18.932375,
        "longitude": 72.823175
      },
      {
        "latitude": 18.932587,
        "longitude": 72.823254
      },
      {
        "latitude": 18.93294,
        "longitude": 72.82337
      },
      {
        "latitude": 18.933156,
        "longitude": 72.823436
      },
      {
        "latitude": 18.933439,
        "longitude": 72.823522
      },
      {
        "latitude": 18.933979,
        "longitude": 72.823665
      },
      {
        "latitude": 18.934198,
        "longitude": 72.82372
      },
      {
        "latitude": 18.934416,
        "longitude": 72.823775
      },
      {
        "latitude": 18.934727,
        "longitude": 72.823843
      },
      {
        "latitude": 18.934947,
        "longitude": 72.823888
      },
      {
        "latitude": 18.935168,
        "longitude": 72.823934
      },
      {
        "latitude": 18.935496,
        "longitude": 72.823982
      },
      {
        "latitude": 18.93572,
        "longitude": 72.824009
      },
      {
        "latitude": 18.935943,
        "longitude": 72.824035
      },
      {
        "latitude": 18.936167,
        "longitude": 72.824061
      },
      {
        "latitude": 18.93639,
        "longitude": 72.824088
      },
      {
        "latitude": 18.936794,
        "longitude": 72.824135
      },
      {
        "latitude": 18.937337,
        "longitude": 72.824169
      },
      {
        "latitude": 18.937723,
        "longitude": 72.824166
      },
      {
        "latitude": 18.937948,
        "longitude": 72.824165
      },
      {
        "latitude": 18.938172,
        "longitude": 72.824164
      },
      {
        "latitude": 18.938532,
        "longitude": 72.824164
      },
      {
        "latitude": 18.938785,
        "longitude": 72.82415
      },
      {
        "latitude": 18.939216,
        "longitude": 72.824113
      },
      {
        "latitude": 18.939439,
        "longitude": 72.824089
      },
      {
        "latitude": 18.939663,
        "longitude": 72.824064
      },
      {
        "latitude": 18.939974,
        "longitude": 72.824013
      },
      {
        "latitude": 18.940195,
        "longitude": 72.823973
      },
      {
        "latitude": 18.940417,
        "longitude": 72.823932
      },
      {
        "latitude": 18.940698,
        "longitude": 72.823872
      },
      {
        "latitude": 18.940918,
        "longitude": 72.823824
      },
      {
        "latitude": 18.941138,
        "longitude": 72.823775
      },
      {
        "latitude": 18.941358,
        "longitude": 72.823726
      },
      {
        "latitude": 18.941681,
        "longitude": 72.823645
      },
      {
        "latitude": 18.941899,
        "longitude": 72.823586
      },
      {
        "latitude": 18.942117,
        "longitude": 72.823528
      },
      {
        "latitude": 18.942455,
        "longitude": 72.823428
      },
      {
        "latitude": 18.943288,
        "longitude": 72.823094
      },
      {
        "latitude": 18.943605,
        "longitude": 72.822967
      },
      {
        "latitude": 18.943835,
        "longitude": 72.82286
      },
      {
        "latitude": 18.94404,
        "longitude": 72.822763
      },
      {
        "latitude": 18.944246,
        "longitude": 72.822666
      },
      {
        "latitude": 18.944474,
        "longitude": 72.822554
      },
      {
        "latitude": 18.944678,
        "longitude": 72.822454
      },
      {
        "latitude": 18.944882,
        "longitude": 72.822354
      },
      {
        "latitude": 18.945118,
        "longitude": 72.822223
      },
      {
        "latitude": 18.945377,
        "longitude": 72.822103
      },
      {
        "latitude": 18.945771,
        "longitude": 72.821888
      },
      {
        "latitude": 18.945961,
        "longitude": 72.821762
      },
      {
        "latitude": 18.946152,
        "longitude": 72.821635
      },
      {
        "latitude": 18.946342,
        "longitude": 72.821509
      },
      {
        "latitude": 18.946533,
        "longitude": 72.821383
      },
      {
        "latitude": 18.946723,
        "longitude": 72.821257
      },
      {
        "latitude": 18.947051,
        "longitude": 72.821029
      },
      {
        "latitude": 18.947237,
        "longitude": 72.820896
      },
      {
        "latitude": 18.947481,
        "longitude": 72.820711
      },
      {
        "latitude": 18.947662,
        "longitude": 72.82057
      },
      {
        "latitude": 18.947954,
        "longitude": 72.82035
      },
      {
        "latitude": 18.948138,
        "longitude": 72.820213
      },
      {
        "latitude": 18.948321,
        "longitude": 72.820076
      },
      {
        "latitude": 18.948505,
        "longitude": 72.81994
      },
      {
        "latitude": 18.948738,
        "longitude": 72.819769
      },
      {
        "latitude": 18.948923,
        "longitude": 72.819633
      },
      {
        "latitude": 18.949108,
        "longitude": 72.819498
      },
      {
        "latitude": 18.949441,
        "longitude": 72.819233
      },
      {
        "latitude": 18.949617,
        "longitude": 72.819084
      },
      {
        "latitude": 18.949928,
        "longitude": 72.818815
      },
      {
        "latitude": 18.9501,
        "longitude": 72.818663
      },
      {
        "latitude": 18.950273,
        "longitude": 72.81851
      },
      {
        "latitude": 18.950446,
        "longitude": 72.818358
      },
      {
        "latitude": 18.950619,
        "longitude": 72.818206
      },
      {
        "latitude": 18.950791,
        "longitude": 72.818054
      },
      {
        "latitude": 18.951095,
        "longitude": 72.817781
      },
      {
        "latitude": 18.951265,
        "longitude": 72.817625
      },
      {
        "latitude": 18.951435,
        "longitude": 72.81747
      },
      {
        "latitude": 18.951708,
        "longitude": 72.817216
      },
      {
        "latitude": 18.951876,
        "longitude": 72.817059
      },
      {
        "latitude": 18.952045,
        "longitude": 72.816901
      },
      {
        "latitude": 18.952213,
        "longitude": 72.816743
      },
      {
        "latitude": 18.952381,
        "longitude": 72.816585
      },
      {
        "latitude": 18.952593,
        "longitude": 72.81639
      },
      {
        "latitude": 18.952763,
        "longitude": 72.816235
      },
      {
        "latitude": 18.953074,
        "longitude": 72.815959
      },
      {
        "latitude": 18.953251,
        "longitude": 72.815813
      },
      {
        "latitude": 18.953429,
        "longitude": 72.815667
      },
      {
        "latitude": 18.953643,
        "longitude": 72.815514
      },
      {
        "latitude": 18.95431,
        "longitude": 72.814884
      },
      {
        "latitude": 18.954563,
        "longitude": 72.814544
      },
      {
        "latitude": 18.954696,
        "longitude": 72.814352
      },
      {
        "latitude": 18.954927,
        "longitude": 72.814018
      },
      {
        "latitude": 18.955097,
        "longitude": 72.81376
      },
      {
        "latitude": 18.95526,
        "longitude": 72.813459
      },
      {
        "latitude": 18.955364,
        "longitude": 72.813249
      },
      {
        "latitude": 18.955466,
        "longitude": 72.812997
      },
      {
        "latitude": 18.955552,
        "longitude": 72.812778
      },
      {
        "latitude": 18.955638,
        "longitude": 72.812558
      },
      {
        "latitude": 18.95597,
        "longitude": 72.812916
      },
      {
        "latitude": 18.956075,
        "longitude": 72.813224
      },
      {
        "latitude": 18.956151,
        "longitude": 72.813448
      },
      {
        "latitude": 18.956227,
        "longitude": 72.813671
      },
      {
        "latitude": 18.956389,
        "longitude": 72.814136
      },
      {
        "latitude": 18.956463,
        "longitude": 72.81436
      },
      {
        "latitude": 18.956576,
        "longitude": 72.814698
      },
      {
        "latitude": 18.956696,
        "longitude": 72.81505
      },
      {
        "latitude": 18.956773,
        "longitude": 72.815273
      },
      {
        "latitude": 18.956839,
        "longitude": 72.815521
      },
      {
        "latitude": 18.956627,
        "longitude": 72.815221
      },
      {
        "latitude": 18.956559,
        "longitude": 72.814994
      },
      {
        "latitude": 18.956448,
        "longitude": 72.814648
      },
      {
        "latitude": 18.956306,
        "longitude": 72.814219
      },
      {
        "latitude": 18.95613,
        "longitude": 72.813702
      },
      {
        "latitude": 18.956056,
        "longitude": 72.813477
      },
      {
        "latitude": 18.955982,
        "longitude": 72.813253
      },
      {
        "latitude": 18.955908,
        "longitude": 72.813028
      },
      {
        "latitude": 18.955603,
        "longitude": 72.813036
      },
      {
        "latitude": 18.955516,
        "longitude": 72.813255
      },
      {
        "latitude": 18.955401,
        "longitude": 72.813491
      },
      {
        "latitude": 18.955269,
        "longitude": 72.81374
      },
      {
        "latitude": 18.955132,
        "longitude": 72.813957
      },
      {
        "latitude": 18.95485,
        "longitude": 72.814368
      },
      {
        "latitude": 18.954713,
        "longitude": 72.814556
      },
      {
        "latitude": 18.954389,
        "longitude": 72.814974
      },
      {
        "latitude": 18.954242,
        "longitude": 72.815167
      },
      {
        "latitude": 18.953767,
        "longitude": 72.815613
      },
      {
        "latitude": 18.953339,
        "longitude": 72.815919
      },
      {
        "latitude": 18.953154,
        "longitude": 72.816055
      },
      {
        "latitude": 18.95297,
        "longitude": 72.81619
      },
      {
        "latitude": 18.952768,
        "longitude": 72.816386
      },
      {
        "latitude": 18.952601,
        "longitude": 72.816545
      },
      {
        "latitude": 18.952433,
        "longitude": 72.816704
      },
      {
        "latitude": 18.952266,
        "longitude": 72.816863
      },
      {
        "latitude": 18.952099,
        "longitude": 72.817022
      },
      {
        "latitude": 18.951932,
        "longitude": 72.81718
      },
      {
        "latitude": 18.951652,
        "longitude": 72.817432
      },
      {
        "latitude": 18.951478,
        "longitude": 72.817582
      },
      {
        "latitude": 18.951304,
        "longitude": 72.817733
      },
      {
        "latitude": 18.95113,
        "longitude": 72.817884
      },
      {
        "latitude": 18.950956,
        "longitude": 72.818034
      },
      {
        "latitude": 18.950782,
        "longitude": 72.818185
      },
      {
        "latitude": 18.950608,
        "longitude": 72.818335
      },
      {
        "latitude": 18.950291,
        "longitude": 72.818635
      },
      {
        "latitude": 18.950129,
        "longitude": 72.8188
      },
      {
        "latitude": 18.949922,
        "longitude": 72.818979
      },
      {
        "latitude": 18.949746,
        "longitude": 72.819126
      },
      {
        "latitude": 18.949291,
        "longitude": 72.819456
      },
      {
        "latitude": 18.948938,
        "longitude": 72.819743
      },
      {
        "latitude": 18.948759,
        "longitude": 72.819887
      },
      {
        "latitude": 18.948464,
        "longitude": 72.820118
      },
      {
        "latitude": 18.948282,
        "longitude": 72.820259
      },
      {
        "latitude": 18.948034,
        "longitude": 72.820452
      },
      {
        "latitude": 18.947853,
        "longitude": 72.820593
      },
      {
        "latitude": 18.947607,
        "longitude": 72.820778
      },
      {
        "latitude": 18.947424,
        "longitude": 72.820915
      },
      {
        "latitude": 18.94724,
        "longitude": 72.821052
      },
      {
        "latitude": 18.947056,
        "longitude": 72.821189
      },
      {
        "latitude": 18.946851,
        "longitude": 72.821321
      },
      {
        "latitude": 18.946659,
        "longitude": 72.821444
      },
      {
        "latitude": 18.946466,
        "longitude": 72.821566
      },
      {
        "latitude": 18.94617,
        "longitude": 72.821757
      },
      {
        "latitude": 18.945978,
        "longitude": 72.821881
      },
      {
        "latitude": 18.945787,
        "longitude": 72.822005
      },
      {
        "latitude": 18.945518,
        "longitude": 72.822164
      },
      {
        "latitude": 18.945321,
        "longitude": 72.822278
      },
      {
        "latitude": 18.945002,
        "longitude": 72.822446
      },
      {
        "latitude": 18.944799,
        "longitude": 72.822548
      },
      {
        "latitude": 18.944595,
        "longitude": 72.822649
      },
      {
        "latitude": 18.944392,
        "longitude": 72.822751
      },
      {
        "latitude": 18.944189,
        "longitude": 72.822853
      },
      {
        "latitude": 18.943841,
        "longitude": 72.823007
      },
      {
        "latitude": 18.943631,
        "longitude": 72.823092
      },
      {
        "latitude": 18.943394,
        "longitude": 72.823195
      },
      {
        "latitude": 18.943187,
        "longitude": 72.823286
      },
      {
        "latitude": 18.942979,
        "longitude": 72.823378
      },
      {
        "latitude": 18.943124,
        "longitude": 72.823045
      },
      {
        "latitude": 18.943331,
        "longitude": 72.822953
      },
      {
        "latitude": 18.94358,
        "longitude": 72.822841
      },
      {
        "latitude": 18.943877,
        "longitude": 72.8227
      },
      {
        "latitude": 18.944081,
        "longitude": 72.822599
      },
      {
        "latitude": 18.944284,
        "longitude": 72.822499
      },
      {
        "latitude": 18.944488,
        "longitude": 72.822399
      },
      {
        "latitude": 18.944692,
        "longitude": 72.822298
      },
      {
        "latitude": 18.944896,
        "longitude": 72.822198
      },
      {
        "latitude": 18.945219,
        "longitude": 72.822027
      },
      {
        "latitude": 18.945418,
        "longitude": 72.821916
      },
      {
        "latitude": 18.945617,
        "longitude": 72.821806
      },
      {
        "latitude": 18.945888,
        "longitude": 72.821658
      },
      {
        "latitude": 18.946107,
        "longitude": 72.821511
      },
      {
        "latitude": 18.946295,
        "longitude": 72.821381
      },
      {
        "latitude": 18.946483,
        "longitude": 72.821251
      },
      {
        "latitude": 18.946672,
        "longitude": 72.82112
      },
      {
        "latitude": 18.947042,
        "longitude": 72.820866
      },
      {
        "latitude": 18.947231,
        "longitude": 72.820738
      },
      {
        "latitude": 18.94742,
        "longitude": 72.820609
      },
      {
        "latitude": 18.947604,
        "longitude": 72.820464
      },
      {
        "latitude": 18.947783,
        "longitude": 72.820321
      },
      {
        "latitude": 18.947963,
        "longitude": 72.820178
      },
      {
        "latitude": 18.948143,
        "longitude": 72.820035
      },
      {
        "latitude": 18.948322,
        "longitude": 72.819893
      },
      {
        "latitude": 18.948502,
        "longitude": 72.81975
      },
      {
        "latitude": 18.948682,
        "longitude": 72.819607
      },
      {
        "latitude": 18.948913,
        "longitude": 72.819405
      },
      {
        "latitude": 18.949085,
        "longitude": 72.819251
      },
      {
        "latitude": 18.949256,
        "longitude": 72.819097
      },
      {
        "latitude": 18.949428,
        "longitude": 72.818944
      },
      {
        "latitude": 18.949599,
        "longitude": 72.81879
      },
      {
        "latitude": 18.949882,
        "longitude": 72.818541
      },
      {
        "latitude": 18.950056,
        "longitude": 72.818391
      },
      {
        "latitude": 18.950235,
        "longitude": 72.818211
      },
      {
        "latitude": 18.950397,
        "longitude": 72.818047
      },
      {
        "latitude": 18.95056,
        "longitude": 72.817882
      },
      {
        "latitude": 18.950837,
        "longitude": 72.817566
      },
      {
        "latitude": 18.950982,
        "longitude": 72.817384
      },
      {
        "latitude": 18.951127,
        "longitude": 72.817203
      },
      {
        "latitude": 18.951271,
        "longitude": 72.817021
      },
      {
        "latitude": 18.951416,
        "longitude": 72.816839
      },
      {
        "latitude": 18.951562,
        "longitude": 72.81664
      },
      {
        "latitude": 18.9517,
        "longitude": 72.816452
      },
      {
        "latitude": 18.95186,
        "longitude": 72.816186
      },
      {
        "latitude": 18.952073,
        "longitude": 72.815813
      },
      {
        "latitude": 18.952189,
        "longitude": 72.81561
      },
      {
        "latitude": 18.952306,
        "longitude": 72.815406
      },
      {
        "latitude": 18.952422,
        "longitude": 72.815203
      },
      {
        "latitude": 18.952539,
        "longitude": 72.815
      },
      {
        "latitude": 18.952656,
        "longitude": 72.814797
      },
      {
        "latitude": 18.95283,
        "longitude": 72.814472
      },
      {
        "latitude": 18.952938,
        "longitude": 72.814264
      },
      {
        "latitude": 18.953046,
        "longitude": 72.814055
      },
      {
        "latitude": 18.953153,
        "longitude": 72.813847
      },
      {
        "latitude": 18.953269,
        "longitude": 72.813594
      },
      {
        "latitude": 18.953365,
        "longitude": 72.813379
      },
      {
        "latitude": 18.953499,
        "longitude": 72.813056
      },
      {
        "latitude": 18.953587,
        "longitude": 72.812837
      },
      {
        "latitude": 18.953674,
        "longitude": 72.812618
      },
      {
        "latitude": 18.953761,
        "longitude": 72.812399
      },
      {
        "latitude": 18.953849,
        "longitude": 72.81218
      },
      {
        "latitude": 18.953936,
        "longitude": 72.811961
      },
      {
        "latitude": 18.954023,
        "longitude": 72.811742
      },
      {
        "latitude": 18.954111,
        "longitude": 72.811523
      },
      {
        "latitude": 18.954198,
        "longitude": 72.811304
      },
      {
        "latitude": 18.954285,
        "longitude": 72.811084
      },
      {
        "latitude": 18.954373,
        "longitude": 72.810865
      },
      {
        "latitude": 18.95446,
        "longitude": 72.810646
      },
      {
        "latitude": 18.954547,
        "longitude": 72.810427
      },
      {
        "latitude": 18.954635,
        "longitude": 72.810208
      },
      {
        "latitude": 18.954722,
        "longitude": 72.809989
      },
      {
        "latitude": 18.954809,
        "longitude": 72.80977
      },
      {
        "latitude": 18.954898,
        "longitude": 72.809518
      },
      {
        "latitude": 18.954974,
        "longitude": 72.809294
      },
      {
        "latitude": 18.955051,
        "longitude": 72.809071
      },
      {
        "latitude": 18.955128,
        "longitude": 72.808847
      },
      {
        "latitude": 18.955205,
        "longitude": 72.808624
      },
      {
        "latitude": 18.955281,
        "longitude": 72.8084
      },
      {
        "latitude": 18.955358,
        "longitude": 72.808177
      },
      {
        "latitude": 18.955435,
        "longitude": 72.807953
      },
      {
        "latitude": 18.955511,
        "longitude": 72.80773
      },
      {
        "latitude": 18.955588,
        "longitude": 72.807506
      },
      {
        "latitude": 18.955665,
        "longitude": 72.807283
      },
      {
        "latitude": 18.955742,
        "longitude": 72.80706
      },
      {
        "latitude": 18.955818,
        "longitude": 72.806836
      },
      {
        "latitude": 18.955895,
        "longitude": 72.806613
      },
      {
        "latitude": 18.955972,
        "longitude": 72.806389
      },
      {
        "latitude": 18.956049,
        "longitude": 72.806166
      },
      {
        "latitude": 18.956125,
        "longitude": 72.805942
      },
      {
        "latitude": 18.956202,
        "longitude": 72.805719
      },
      {
        "latitude": 18.956279,
        "longitude": 72.805495
      },
      {
        "latitude": 18.956355,
        "longitude": 72.805272
      },
      {
        "latitude": 18.956432,
        "longitude": 72.805048
      },
      {
        "latitude": 18.956509,
        "longitude": 72.804825
      },
      {
        "latitude": 18.956586,
        "longitude": 72.804602
      },
      {
        "latitude": 18.956662,
        "longitude": 72.804378
      },
      {
        "latitude": 18.956739,
        "longitude": 72.804155
      },
      {
        "latitude": 18.956816,
        "longitude": 72.803931
      },
      {
        "latitude": 18.956892,
        "longitude": 72.803708
      },
      {
        "latitude": 18.956969,
        "longitude": 72.803484
      },
      {
        "latitude": 18.957046,
        "longitude": 72.803261
      },
      {
        "latitude": 18.957123,
        "longitude": 72.803037
      },
      {
        "latitude": 18.957199,
        "longitude": 72.802814
      },
      {
        "latitude": 18.957276,
        "longitude": 72.80259
      },
      {
        "latitude": 18.957353,
        "longitude": 72.802367
      },
      {
        "latitude": 18.957429,
        "longitude": 72.802144
      },
      {
        "latitude": 18.957506,
        "longitude": 72.80192
      },
      {
        "latitude": 18.957583,
        "longitude": 72.801697
      },
      {
        "latitude": 18.957703,
        "longitude": 72.801432
      },
      {
        "latitude": 18.957805,
        "longitude": 72.80122
      },
      {
        "latitude": 18.957948,
        "longitude": 72.800968
      },
      {
        "latitude": 18.958066,
        "longitude": 72.800766
      },
      {
        "latitude": 18.958248,
        "longitude": 72.800504
      },
      {
        "latitude": 18.958386,
        "longitude": 72.800317
      },
      {
        "latitude": 18.958525,
        "longitude": 72.800129
      },
      {
        "latitude": 18.958716,
        "longitude": 72.799949
      },
      {
        "latitude": 18.958887,
        "longitude": 72.799796
      },
      {
        "latitude": 18.959182,
        "longitude": 72.7996
      },
      {
        "latitude": 18.959382,
        "longitude": 72.79949
      },
      {
        "latitude": 18.95977,
        "longitude": 72.799303
      },
      {
        "latitude": 18.960187,
        "longitude": 72.799178
      },
      {
        "latitude": 18.960408,
        "longitude": 72.799136
      },
      {
        "latitude": 18.960804,
        "longitude": 72.799088
      },
      {
        "latitude": 18.961029,
        "longitude": 72.799074
      },
      {
        "latitude": 18.961299,
        "longitude": 72.799085
      },
      {
        "latitude": 18.961602,
        "longitude": 72.799145
      },
      {
        "latitude": 18.96182,
        "longitude": 72.799201
      },
      {
        "latitude": 18.962061,
        "longitude": 72.799259
      },
      {
        "latitude": 18.96228,
        "longitude": 72.799312
      },
      {
        "latitude": 18.9625,
        "longitude": 72.799365
      },
      {
        "latitude": 18.962719,
        "longitude": 72.799418
      },
      {
        "latitude": 18.963004,
        "longitude": 72.799491
      },
      {
        "latitude": 18.963223,
        "longitude": 72.799548
      },
      {
        "latitude": 18.963441,
        "longitude": 72.799605
      },
      {
        "latitude": 18.963659,
        "longitude": 72.799662
      },
      {
        "latitude": 18.963877,
        "longitude": 72.799719
      },
      {
        "latitude": 18.964096,
        "longitude": 72.799776
      },
      {
        "latitude": 18.964314,
        "longitude": 72.799832
      },
      {
        "latitude": 18.964532,
        "longitude": 72.799889
      },
      {
        "latitude": 18.964751,
        "longitude": 72.799946
      },
      {
        "latitude": 18.964969,
        "longitude": 72.800003
      },
      {
        "latitude": 18.965187,
        "longitude": 72.80006
      },
      {
        "latitude": 18.965405,
        "longitude": 72.800117
      },
      {
        "latitude": 18.965624,
        "longitude": 72.800174
      },
      {
        "latitude": 18.965842,
        "longitude": 72.800231
      },
      {
        "latitude": 18.96606,
        "longitude": 72.800288
      },
      {
        "latitude": 18.966279,
        "longitude": 72.800345
      },
      {
        "latitude": 18.966497,
        "longitude": 72.800402
      },
      {
        "latitude": 18.966715,
        "longitude": 72.800459
      },
      {
        "latitude": 18.967002,
        "longitude": 72.800494
      },
      {
        "latitude": 18.967226,
        "longitude": 72.800514
      },
      {
        "latitude": 18.967507,
        "longitude": 72.800548
      },
      {
        "latitude": 18.968051,
        "longitude": 72.80066
      },
      {
        "latitude": 18.968405,
        "longitude": 72.800759
      },
      {
        "latitude": 18.968622,
        "longitude": 72.800821
      },
      {
        "latitude": 18.968215,
        "longitude": 72.800155
      },
      {
        "latitude": 18.968153,
        "longitude": 72.800384
      },
      {
        "latitude": 18.96809,
        "longitude": 72.800612
      },
      {
        "latitude": 18.968027,
        "longitude": 72.80084
      },
      {
        "latitude": 18.967964,
        "longitude": 72.801068
      },
      {
        "latitude": 18.967902,
        "longitude": 72.801297
      },
      {
        "latitude": 18.967839,
        "longitude": 72.801525
      },
      {
        "latitude": 18.967776,
        "longitude": 72.801753
      },
      {
        "latitude": 18.967692,
        "longitude": 72.802058
      },
      {
        "latitude": 18.967546,
        "longitude": 72.802561
      },
      {
        "latitude": 18.967429,
        "longitude": 72.802972
      },
      {
        "latitude": 18.966692,
        "longitude": 72.803583
      },
      {
        "latitude": 18.966379,
        "longitude": 72.80362
      },
      {
        "latitude": 18.96609,
        "longitude": 72.803653
      },
      {
        "latitude": 18.965742,
        "longitude": 72.803711
      },
      {
        "latitude": 18.96491,
        "longitude": 72.804233
      },
      {
        "latitude": 18.964771,
        "longitude": 72.804441
      },
      {
        "latitude": 18.964719,
        "longitude": 72.804897
      },
      {
        "latitude": 18.964402,
        "longitude": 72.806191
      },
      {
        "latitude": 18.964194,
        "longitude": 72.80676
      },
      {
        "latitude": 18.964141,
        "longitude": 72.807251
      },
      {
        "latitude": 18.963689,
        "longitude": 72.80776
      },
      {
        "latitude": 18.963143,
        "longitude": 72.807912
      },
      {
        "latitude": 18.962754,
        "longitude": 72.808068
      },
      {
        "latitude": 18.962533,
        "longitude": 72.80817
      },
      {
        "latitude": 18.962327,
        "longitude": 72.808265
      },
      {
        "latitude": 18.96212,
        "longitude": 72.808359
      },
      {
        "latitude": 18.961592,
        "longitude": 72.808551
      },
      {
        "latitude": 18.961388,
        "longitude": 72.808652
      },
      {
        "latitude": 18.96116,
        "longitude": 72.808777
      },
      {
        "latitude": 18.960776,
        "longitude": 72.809001
      },
      {
        "latitude": 18.960582,
        "longitude": 72.809121
      },
      {
        "latitude": 18.960361,
        "longitude": 72.809257
      },
      {
        "latitude": 18.960046,
        "longitude": 72.809413
      },
      {
        "latitude": 18.959852,
        "longitude": 72.809535
      },
      {
        "latitude": 18.959659,
        "longitude": 72.809656
      },
      {
        "latitude": 18.959465,
        "longitude": 72.809778
      },
      {
        "latitude": 18.959272,
        "longitude": 72.809899
      },
      {
        "latitude": 18.958882,
        "longitude": 72.810112
      },
      {
        "latitude": 18.958682,
        "longitude": 72.810256
      },
      {
        "latitude": 18.958391,
        "longitude": 72.81065
      },
      {
        "latitude": 18.958057,
        "longitude": 72.811217
      },
      {
        "latitude": 18.957937,
        "longitude": 72.811417
      },
      {
        "latitude": 18.957816,
        "longitude": 72.811618
      },
      {
        "latitude": 18.957696,
        "longitude": 72.811819
      },
      {
        "latitude": 18.95748,
        "longitude": 72.812176
      },
      {
        "latitude": 18.957359,
        "longitude": 72.812377
      },
      {
        "latitude": 18.957238,
        "longitude": 72.812577
      },
      {
        "latitude": 18.957038,
        "longitude": 72.812883
      },
      {
        "latitude": 18.956905,
        "longitude": 72.813075
      },
      {
        "latitude": 18.956773,
        "longitude": 72.813268
      },
      {
        "latitude": 18.956641,
        "longitude": 72.81346
      },
      {
        "latitude": 18.956509,
        "longitude": 72.813652
      },
      {
        "latitude": 18.95613,
        "longitude": 72.813702
      },
      {
        "latitude": 18.956056,
        "longitude": 72.813477
      },
      {
        "latitude": 18.955982,
        "longitude": 72.813253
      },
      {
        "latitude": 18.955908,
        "longitude": 72.813028
      },
      {
        "latitude": 18.955603,
        "longitude": 72.813036
      },
      {
        "latitude": 18.955516,
        "longitude": 72.813255
      },
      {
        "latitude": 18.955401,
        "longitude": 72.813491
      },
      {
        "latitude": 18.955269,
        "longitude": 72.81374
      },
      {
        "latitude": 18.955132,
        "longitude": 72.813957
      },
      {
        "latitude": 18.95485,
        "longitude": 72.814368
      },
      {
        "latitude": 18.954713,
        "longitude": 72.814556
      },
      {
        "latitude": 18.954389,
        "longitude": 72.814974
      },
      {
        "latitude": 18.954242,
        "longitude": 72.815167
      },
      {
        "latitude": 18.953767,
        "longitude": 72.815613
      },
      {
        "latitude": 18.953339,
        "longitude": 72.815919
      },
      {
        "latitude": 18.953154,
        "longitude": 72.816055
      },
      {
        "latitude": 18.95297,
        "longitude": 72.81619
      },
      {
        "latitude": 18.952768,
        "longitude": 72.816386
      },
      {
        "latitude": 18.952601,
        "longitude": 72.816545
      },
      {
        "latitude": 18.952433,
        "longitude": 72.816704
      },
      {
        "latitude": 18.952266,
        "longitude": 72.816863
      },
      {
        "latitude": 18.952099,
        "longitude": 72.817022
      },
      {
        "latitude": 18.951932,
        "longitude": 72.81718
      },
      {
        "latitude": 18.951652,
        "longitude": 72.817432
      },
      {
        "latitude": 18.951478,
        "longitude": 72.817582
      },
      {
        "latitude": 18.951304,
        "longitude": 72.817733
      },
      {
        "latitude": 18.95113,
        "longitude": 72.817884
      },
      {
        "latitude": 18.950956,
        "longitude": 72.818034
      },
      {
        "latitude": 18.950782,
        "longitude": 72.818185
      },
      {
        "latitude": 18.950608,
        "longitude": 72.818335
      },
      {
        "latitude": 18.950291,
        "longitude": 72.818635
      },
      {
        "latitude": 18.950129,
        "longitude": 72.8188
      },
      {
        "latitude": 18.949922,
        "longitude": 72.818979
      },
      {
        "latitude": 18.949746,
        "longitude": 72.819126
      },
      {
        "latitude": 18.949291,
        "longitude": 72.819456
      },
      {
        "latitude": 18.948938,
        "longitude": 72.819743
      },
      {
        "latitude": 18.948759,
        "longitude": 72.819887
      },
      {
        "latitude": 18.948464,
        "longitude": 72.820118
      },
      {
        "latitude": 18.948282,
        "longitude": 72.820259
      },
      {
        "latitude": 18.948034,
        "longitude": 72.820452
      },
      {
        "latitude": 18.947853,
        "longitude": 72.820593
      },
      {
        "latitude": 18.947607,
        "longitude": 72.820778
      },
      {
        "latitude": 18.947424,
        "longitude": 72.820915
      },
      {
        "latitude": 18.94724,
        "longitude": 72.821052
      },
      {
        "latitude": 18.947056,
        "longitude": 72.821189
      },
      {
        "latitude": 18.946851,
        "longitude": 72.821321
      },
      {
        "latitude": 18.946659,
        "longitude": 72.821444
      },
      {
        "latitude": 18.946466,
        "longitude": 72.821566
      },
      {
        "latitude": 18.94617,
        "longitude": 72.821757
      },
      {
        "latitude": 18.945978,
        "longitude": 72.821881
      },
      {
        "latitude": 18.945787,
        "longitude": 72.822005
      },
      {
        "latitude": 18.945518,
        "longitude": 72.822164
      },
      {
        "latitude": 18.945321,
        "longitude": 72.822278
      },
      {
        "latitude": 18.945002,
        "longitude": 72.822446
      },
      {
        "latitude": 18.944799,
        "longitude": 72.822548
      },
      {
        "latitude": 18.944595,
        "longitude": 72.822649
      },
      {
        "latitude": 18.944392,
        "longitude": 72.822751
      },
      {
        "latitude": 18.944189,
        "longitude": 72.822853
      },
      {
        "latitude": 18.943841,
        "longitude": 72.823007
      },
      {
        "latitude": 18.943631,
        "longitude": 72.823092
      },
      {
        "latitude": 18.943394,
        "longitude": 72.823195
      },
      {
        "latitude": 18.943187,
        "longitude": 72.823286
      },
      {
        "latitude": 18.942979,
        "longitude": 72.823378
      },
      {
        "latitude": 18.94235,
        "longitude": 72.823587
      },
      {
        "latitude": 18.94202,
        "longitude": 72.823686
      },
      {
        "latitude": 18.941721,
        "longitude": 72.823771
      },
      {
        "latitude": 18.94129,
        "longitude": 72.823882
      },
      {
        "latitude": 18.940858,
        "longitude": 72.823972
      },
      {
        "latitude": 18.940468,
        "longitude": 72.824035
      },
      {
        "latitude": 18.940131,
        "longitude": 72.824095
      },
      {
        "latitude": 18.939807,
        "longitude": 72.824152
      },
      {
        "latitude": 18.939443,
        "longitude": 72.824203
      },
      {
        "latitude": 18.939047,
        "longitude": 72.824237
      },
      {
        "latitude": 18.93869,
        "longitude": 72.824265
      },
      {
        "latitude": 18.938328,
        "longitude": 72.824281
      },
      {
        "latitude": 18.937927,
        "longitude": 72.824284
      },
      {
        "latitude": 18.937554,
        "longitude": 72.824288
      },
      {
        "latitude": 18.937188,
        "longitude": 72.824294
      },
      {
        "latitude": 18.936711,
        "longitude": 72.824259
      },
      {
        "latitude": 18.936307,
        "longitude": 72.824216
      },
      {
        "latitude": 18.936084,
        "longitude": 72.824192
      },
      {
        "latitude": 18.93583,
        "longitude": 72.824161
      },
      {
        "latitude": 18.935473,
        "longitude": 72.824112
      },
      {
        "latitude": 18.935052,
        "longitude": 72.824046
      },
      {
        "latitude": 18.934667,
        "longitude": 72.823965
      },
      {
        "latitude": 18.934255,
        "longitude": 72.823873
      },
      {
        "latitude": 18.93388,
        "longitude": 72.823792
      },
      {
        "latitude": 18.933249,
        "longitude": 72.823615
      },
      {
        "latitude": 18.932791,
        "longitude": 72.823466
      },
      {
        "latitude": 18.932258,
        "longitude": 72.823268
      },
      {
        "latitude": 18.931907,
        "longitude": 72.82312
      },
      {
        "latitude": 18.931104,
        "longitude": 72.822749
      },
      {
        "latitude": 18.9309,
        "longitude": 72.822648
      },
      {
        "latitude": 18.930594,
        "longitude": 72.822497
      },
      {
        "latitude": 18.930391,
        "longitude": 72.822397
      },
      {
        "latitude": 18.930156,
        "longitude": 72.822264
      },
      {
        "latitude": 18.929624,
        "longitude": 72.821956
      },
      {
        "latitude": 18.929429,
        "longitude": 72.822205
      },
      {
        "latitude": 18.929065,
        "longitude": 72.822856
      },
      {
        "latitude": 18.9288,
        "longitude": 72.823295
      },
      {
        "latitude": 18.928686,
        "longitude": 72.823499
      },
      {
        "latitude": 18.928571,
        "longitude": 72.823704
      },
      {
        "latitude": 18.928457,
        "longitude": 72.823909
      },
      {
        "latitude": 18.928343,
        "longitude": 72.824114
      },
      {
        "latitude": 18.928132,
        "longitude": 72.824479
      },
      {
        "latitude": 18.928012,
        "longitude": 72.824681
      },
      {
        "latitude": 18.927893,
        "longitude": 72.824882
      },
      {
        "latitude": 18.927773,
        "longitude": 72.825084
      },
      {
        "latitude": 18.927654,
        "longitude": 72.825285
      },
      {
        "latitude": 18.927535,
        "longitude": 72.825486
      },
      {
        "latitude": 18.927408,
        "longitude": 72.82572
      },
      {
        "latitude": 18.927297,
        "longitude": 72.825926
      },
      {
        "latitude": 18.927186,
        "longitude": 72.826133
      },
      {
        "latitude": 18.927048,
        "longitude": 72.826391
      },
      {
        "latitude": 18.926937,
        "longitude": 72.826598
      },
      {
        "latitude": 18.926338,
        "longitude": 72.826671
      },
      {
        "latitude": 18.926082,
        "longitude": 72.826321
      },
      {
        "latitude": 18.92587,
        "longitude": 72.826067
      },
      {
        "latitude": 18.925657,
        "longitude": 72.825887
      },
      {
        "latitude": 18.925477,
        "longitude": 72.825744
      },
      {
        "latitude": 18.925429,
        "longitude": 72.824435
      },
      {
        "latitude": 18.925529,
        "longitude": 72.823895
      }
    ]
  },
  {
    "id": "hyderabad",
    "name": "Hyderabad",
    "state": "Telangana",
    "landmark": "Hitec City & Gachibowli",
    "center": {
      "latitude": 17.4504,
      "longitude": 78.3808
    },
    "route": [
      {
        "latitude": 17.450258,
        "longitude": 78.38025
      },
      {
        "latitude": 17.450038,
        "longitude": 78.380616
      },
      {
        "latitude": 17.449921,
        "longitude": 78.380817
      },
      {
        "latitude": 17.449803,
        "longitude": 78.381017
      },
      {
        "latitude": 17.449917,
        "longitude": 78.381311
      },
      {
        "latitude": 17.450046,
        "longitude": 78.381505
      },
      {
        "latitude": 17.45024,
        "longitude": 78.381809
      },
      {
        "latitude": 17.451,
        "longitude": 78.381539
      },
      {
        "latitude": 17.450873,
        "longitude": 78.380358
      },
      {
        "latitude": 17.450745,
        "longitude": 78.380164
      },
      {
        "latitude": 17.450618,
        "longitude": 78.37997
      },
      {
        "latitude": 17.449902,
        "longitude": 78.37946
      },
      {
        "latitude": 17.449676,
        "longitude": 78.37941
      },
      {
        "latitude": 17.449456,
        "longitude": 78.379362
      },
      {
        "latitude": 17.449236,
        "longitude": 78.379313
      },
      {
        "latitude": 17.449016,
        "longitude": 78.379265
      },
      {
        "latitude": 17.448404,
        "longitude": 78.379015
      },
      {
        "latitude": 17.447825,
        "longitude": 78.378568
      },
      {
        "latitude": 17.447126,
        "longitude": 78.378013
      },
      {
        "latitude": 17.446718,
        "longitude": 78.377768
      },
      {
        "latitude": 17.446518,
        "longitude": 78.377646
      },
      {
        "latitude": 17.444982,
        "longitude": 78.377281
      },
      {
        "latitude": 17.443923,
        "longitude": 78.377195
      },
      {
        "latitude": 17.443698,
        "longitude": 78.3772
      },
      {
        "latitude": 17.443136,
        "longitude": 78.377213
      },
      {
        "latitude": 17.442911,
        "longitude": 78.377218
      },
      {
        "latitude": 17.442664,
        "longitude": 78.377224
      },
      {
        "latitude": 17.442439,
        "longitude": 78.377229
      },
      {
        "latitude": 17.442215,
        "longitude": 78.377233
      },
      {
        "latitude": 17.441697,
        "longitude": 78.377242
      },
      {
        "latitude": 17.441457,
        "longitude": 78.377251
      },
      {
        "latitude": 17.440933,
        "longitude": 78.377378
      },
      {
        "latitude": 17.440676,
        "longitude": 78.37739
      },
      {
        "latitude": 17.440452,
        "longitude": 78.377399
      },
      {
        "latitude": 17.440227,
        "longitude": 78.377409
      },
      {
        "latitude": 17.440002,
        "longitude": 78.377419
      },
      {
        "latitude": 17.44,
        "longitude": 78.377183
      },
      {
        "latitude": 17.440226,
        "longitude": 78.377
      },
      {
        "latitude": 17.440451,
        "longitude": 78.377002
      },
      {
        "latitude": 17.440675,
        "longitude": 78.377004
      },
      {
        "latitude": 17.4409,
        "longitude": 78.377007
      },
      {
        "latitude": 17.44116,
        "longitude": 78.377009
      },
      {
        "latitude": 17.441659,
        "longitude": 78.377142
      },
      {
        "latitude": 17.441884,
        "longitude": 78.37714
      },
      {
        "latitude": 17.442108,
        "longitude": 78.377137
      },
      {
        "latitude": 17.44242,
        "longitude": 78.377132
      },
      {
        "latitude": 17.442645,
        "longitude": 78.377127
      },
      {
        "latitude": 17.442869,
        "longitude": 78.377123
      },
      {
        "latitude": 17.443094,
        "longitude": 78.377119
      },
      {
        "latitude": 17.443364,
        "longitude": 78.377112
      },
      {
        "latitude": 17.443738,
        "longitude": 78.377093
      },
      {
        "latitude": 17.444974,
        "longitude": 78.377184
      },
      {
        "latitude": 17.445196,
        "longitude": 78.377222
      },
      {
        "latitude": 17.44548,
        "longitude": 78.377263
      },
      {
        "latitude": 17.445703,
        "longitude": 78.377294
      },
      {
        "latitude": 17.446595,
        "longitude": 78.377588
      },
      {
        "latitude": 17.446791,
        "longitude": 78.377703
      },
      {
        "latitude": 17.447182,
        "longitude": 78.377936
      },
      {
        "latitude": 17.447821,
        "longitude": 78.378381
      },
      {
        "latitude": 17.447996,
        "longitude": 78.378529
      },
      {
        "latitude": 17.448171,
        "longitude": 78.378677
      },
      {
        "latitude": 17.449303,
        "longitude": 78.379191
      },
      {
        "latitude": 17.449523,
        "longitude": 78.37924
      },
      {
        "latitude": 17.449743,
        "longitude": 78.379289
      },
      {
        "latitude": 17.450866,
        "longitude": 78.379934
      },
      {
        "latitude": 17.450997,
        "longitude": 78.380126
      },
      {
        "latitude": 17.451128,
        "longitude": 78.380317
      },
      {
        "latitude": 17.450873,
        "longitude": 78.380358
      },
      {
        "latitude": 17.450745,
        "longitude": 78.380164
      },
      {
        "latitude": 17.450618,
        "longitude": 78.37997
      },
      {
        "latitude": 17.449902,
        "longitude": 78.37946
      },
      {
        "latitude": 17.449676,
        "longitude": 78.37941
      },
      {
        "latitude": 17.449456,
        "longitude": 78.379362
      },
      {
        "latitude": 17.449236,
        "longitude": 78.379313
      },
      {
        "latitude": 17.449016,
        "longitude": 78.379265
      },
      {
        "latitude": 17.448404,
        "longitude": 78.379015
      },
      {
        "latitude": 17.447825,
        "longitude": 78.378568
      },
      {
        "latitude": 17.447126,
        "longitude": 78.378013
      },
      {
        "latitude": 17.446718,
        "longitude": 78.377768
      },
      {
        "latitude": 17.446518,
        "longitude": 78.377646
      },
      {
        "latitude": 17.444982,
        "longitude": 78.377281
      },
      {
        "latitude": 17.443923,
        "longitude": 78.377195
      },
      {
        "latitude": 17.443698,
        "longitude": 78.3772
      },
      {
        "latitude": 17.443136,
        "longitude": 78.377213
      },
      {
        "latitude": 17.442911,
        "longitude": 78.377218
      },
      {
        "latitude": 17.442664,
        "longitude": 78.377224
      },
      {
        "latitude": 17.442439,
        "longitude": 78.377229
      },
      {
        "latitude": 17.442215,
        "longitude": 78.377233
      },
      {
        "latitude": 17.441697,
        "longitude": 78.377242
      },
      {
        "latitude": 17.441457,
        "longitude": 78.377251
      },
      {
        "latitude": 17.441193,
        "longitude": 78.377262
      },
      {
        "latitude": 17.44094,
        "longitude": 78.377271
      },
      {
        "latitude": 17.440716,
        "longitude": 78.37728
      },
      {
        "latitude": 17.440491,
        "longitude": 78.377288
      },
      {
        "latitude": 17.440266,
        "longitude": 78.377297
      },
      {
        "latitude": 17.440042,
        "longitude": 78.377305
      },
      {
        "latitude": 17.439715,
        "longitude": 78.377297
      },
      {
        "latitude": 17.43908,
        "longitude": 78.377033
      },
      {
        "latitude": 17.438872,
        "longitude": 78.376823
      },
      {
        "latitude": 17.438718,
        "longitude": 78.376651
      },
      {
        "latitude": 17.438563,
        "longitude": 78.37648
      },
      {
        "latitude": 17.438409,
        "longitude": 78.376308
      },
      {
        "latitude": 17.43814,
        "longitude": 78.37601
      },
      {
        "latitude": 17.437892,
        "longitude": 78.375694
      },
      {
        "latitude": 17.437747,
        "longitude": 78.375515
      },
      {
        "latitude": 17.437491,
        "longitude": 78.375199
      },
      {
        "latitude": 17.437108,
        "longitude": 78.374794
      },
      {
        "latitude": 17.436618,
        "longitude": 78.374546
      },
      {
        "latitude": 17.436185,
        "longitude": 78.374513
      },
      {
        "latitude": 17.435481,
        "longitude": 78.374538
      },
      {
        "latitude": 17.435257,
        "longitude": 78.374549
      },
      {
        "latitude": 17.434209,
        "longitude": 78.374647
      },
      {
        "latitude": 17.433986,
        "longitude": 78.374675
      },
      {
        "latitude": 17.433762,
        "longitude": 78.374704
      },
      {
        "latitude": 17.433232,
        "longitude": 78.374782
      },
      {
        "latitude": 17.43301,
        "longitude": 78.37482
      },
      {
        "latitude": 17.432751,
        "longitude": 78.374865
      },
      {
        "latitude": 17.432529,
        "longitude": 78.374904
      },
      {
        "latitude": 17.432261,
        "longitude": 78.374961
      },
      {
        "latitude": 17.431996,
        "longitude": 78.375007
      },
      {
        "latitude": 17.431774,
        "longitude": 78.375043
      },
      {
        "latitude": 17.431552,
        "longitude": 78.37508
      },
      {
        "latitude": 17.431329,
        "longitude": 78.375116
      },
      {
        "latitude": 17.431107,
        "longitude": 78.375152
      },
      {
        "latitude": 17.430806,
        "longitude": 78.375192
      },
      {
        "latitude": 17.430582,
        "longitude": 78.375219
      },
      {
        "latitude": 17.430242,
        "longitude": 78.375251
      },
      {
        "latitude": 17.429541,
        "longitude": 78.375175
      },
      {
        "latitude": 17.429275,
        "longitude": 78.375092
      },
      {
        "latitude": 17.42886,
        "longitude": 78.374962
      },
      {
        "latitude": 17.4292,
        "longitude": 78.374275
      },
      {
        "latitude": 17.429512,
        "longitude": 78.374016
      },
      {
        "latitude": 17.430241,
        "longitude": 78.373256
      },
      {
        "latitude": 17.430392,
        "longitude": 78.373081
      },
      {
        "latitude": 17.43066,
        "longitude": 78.372752
      },
      {
        "latitude": 17.430832,
        "longitude": 78.372531
      },
      {
        "latitude": 17.430973,
        "longitude": 78.372348
      },
      {
        "latitude": 17.431319,
        "longitude": 78.371897
      },
      {
        "latitude": 17.43146,
        "longitude": 78.371713
      },
      {
        "latitude": 17.431601,
        "longitude": 78.37153
      },
      {
        "latitude": 17.431808,
        "longitude": 78.371244
      },
      {
        "latitude": 17.431951,
        "longitude": 78.371053
      },
      {
        "latitude": 17.432089,
        "longitude": 78.370867
      },
      {
        "latitude": 17.432228,
        "longitude": 78.370682
      },
      {
        "latitude": 17.432665,
        "longitude": 78.370194
      },
      {
        "latitude": 17.433068,
        "longitude": 78.369815
      },
      {
        "latitude": 17.433237,
        "longitude": 78.369655
      },
      {
        "latitude": 17.433404,
        "longitude": 78.369497
      },
      {
        "latitude": 17.433598,
        "longitude": 78.36932
      },
      {
        "latitude": 17.433769,
        "longitude": 78.369167
      },
      {
        "latitude": 17.433939,
        "longitude": 78.369013
      },
      {
        "latitude": 17.43411,
        "longitude": 78.368859
      },
      {
        "latitude": 17.434352,
        "longitude": 78.368617
      },
      {
        "latitude": 17.434537,
        "longitude": 78.36843
      },
      {
        "latitude": 17.434845,
        "longitude": 78.368069
      },
      {
        "latitude": 17.435213,
        "longitude": 78.367661
      },
      {
        "latitude": 17.43541,
        "longitude": 78.367457
      },
      {
        "latitude": 17.43557,
        "longitude": 78.367292
      },
      {
        "latitude": 17.43573,
        "longitude": 78.367126
      },
      {
        "latitude": 17.435935,
        "longitude": 78.366913
      },
      {
        "latitude": 17.436357,
        "longitude": 78.366431
      },
      {
        "latitude": 17.436583,
        "longitude": 78.366154
      },
      {
        "latitude": 17.436727,
        "longitude": 78.365973
      },
      {
        "latitude": 17.436931,
        "longitude": 78.365734
      },
      {
        "latitude": 17.437188,
        "longitude": 78.365425
      },
      {
        "latitude": 17.437331,
        "longitude": 78.365243
      },
      {
        "latitude": 17.43752,
        "longitude": 78.365006
      },
      {
        "latitude": 17.437679,
        "longitude": 78.364806
      },
      {
        "latitude": 17.437823,
        "longitude": 78.364625
      },
      {
        "latitude": 17.437967,
        "longitude": 78.364444
      },
      {
        "latitude": 17.438109,
        "longitude": 78.364261
      },
      {
        "latitude": 17.43836,
        "longitude": 78.363919
      },
      {
        "latitude": 17.438792,
        "longitude": 78.363315
      },
      {
        "latitude": 17.438971,
        "longitude": 78.363072
      },
      {
        "latitude": 17.439278,
        "longitude": 78.362663
      },
      {
        "latitude": 17.439495,
        "longitude": 78.362327
      },
      {
        "latitude": 17.439616,
        "longitude": 78.362129
      },
      {
        "latitude": 17.439752,
        "longitude": 78.361914
      },
      {
        "latitude": 17.439877,
        "longitude": 78.361719
      },
      {
        "latitude": 17.440003,
        "longitude": 78.361523
      },
      {
        "latitude": 17.440128,
        "longitude": 78.361327
      },
      {
        "latitude": 17.440253,
        "longitude": 78.361131
      },
      {
        "latitude": 17.44049,
        "longitude": 78.36084
      },
      {
        "latitude": 17.440186,
        "longitude": 78.360379
      },
      {
        "latitude": 17.439992,
        "longitude": 78.360168
      },
      {
        "latitude": 17.439404,
        "longitude": 78.359547
      },
      {
        "latitude": 17.439242,
        "longitude": 78.359383
      },
      {
        "latitude": 17.43908,
        "longitude": 78.35922
      },
      {
        "latitude": 17.438918,
        "longitude": 78.359056
      },
      {
        "latitude": 17.438655,
        "longitude": 78.3588
      },
      {
        "latitude": 17.438488,
        "longitude": 78.358641
      },
      {
        "latitude": 17.438322,
        "longitude": 78.358483
      },
      {
        "latitude": 17.438155,
        "longitude": 78.358324
      },
      {
        "latitude": 17.438328,
        "longitude": 78.357909
      },
      {
        "latitude": 17.438483,
        "longitude": 78.357738
      },
      {
        "latitude": 17.4384,
        "longitude": 78.357489
      },
      {
        "latitude": 17.438258,
        "longitude": 78.357307
      },
      {
        "latitude": 17.438408,
        "longitude": 78.357131
      },
      {
        "latitude": 17.438562,
        "longitude": 78.356958
      },
      {
        "latitude": 17.438715,
        "longitude": 78.356786
      },
      {
        "latitude": 17.438949,
        "longitude": 78.356868
      },
      {
        "latitude": 17.439105,
        "longitude": 78.357037
      },
      {
        "latitude": 17.439262,
        "longitude": 78.357206
      },
      {
        "latitude": 17.439419,
        "longitude": 78.357375
      },
      {
        "latitude": 17.439631,
        "longitude": 78.35758
      },
      {
        "latitude": 17.439799,
        "longitude": 78.357736
      },
      {
        "latitude": 17.439666,
        "longitude": 78.358055
      },
      {
        "latitude": 17.439516,
        "longitude": 78.358231
      },
      {
        "latitude": 17.439367,
        "longitude": 78.358407
      },
      {
        "latitude": 17.439151,
        "longitude": 78.35827
      },
      {
        "latitude": 17.43891,
        "longitude": 78.358024
      },
      {
        "latitude": 17.438676,
        "longitude": 78.357798
      },
      {
        "latitude": 17.438389,
        "longitude": 78.357842
      },
      {
        "latitude": 17.438234,
        "longitude": 78.358013
      },
      {
        "latitude": 17.438251,
        "longitude": 78.358338
      },
      {
        "latitude": 17.438541,
        "longitude": 78.358602
      },
      {
        "latitude": 17.438785,
        "longitude": 78.358833
      },
      {
        "latitude": 17.438977,
        "longitude": 78.359025
      },
      {
        "latitude": 17.43914,
        "longitude": 78.359188
      },
      {
        "latitude": 17.439473,
        "longitude": 78.359523
      },
      {
        "latitude": 17.43975,
        "longitude": 78.359828
      },
      {
        "latitude": 17.439925,
        "longitude": 78.360015
      },
      {
        "latitude": 17.440121,
        "longitude": 78.360225
      },
      {
        "latitude": 17.440792,
        "longitude": 78.360401
      },
      {
        "latitude": 17.441074,
        "longitude": 78.359946
      },
      {
        "latitude": 17.441313,
        "longitude": 78.359541
      },
      {
        "latitude": 17.441433,
        "longitude": 78.359342
      },
      {
        "latitude": 17.441663,
        "longitude": 78.35886
      },
      {
        "latitude": 17.441752,
        "longitude": 78.358644
      },
      {
        "latitude": 17.441842,
        "longitude": 78.358428
      },
      {
        "latitude": 17.441935,
        "longitude": 78.358208
      },
      {
        "latitude": 17.442134,
        "longitude": 78.357754
      },
      {
        "latitude": 17.442235,
        "longitude": 78.357501
      },
      {
        "latitude": 17.442319,
        "longitude": 78.357282
      },
      {
        "latitude": 17.442441,
        "longitude": 78.357007
      },
      {
        "latitude": 17.442611,
        "longitude": 78.356625
      },
      {
        "latitude": 17.442705,
        "longitude": 78.35641
      },
      {
        "latitude": 17.442738,
        "longitude": 78.356665
      },
      {
        "latitude": 17.442586,
        "longitude": 78.357015
      },
      {
        "latitude": 17.442484,
        "longitude": 78.357246
      },
      {
        "latitude": 17.442382,
        "longitude": 78.357488
      },
      {
        "latitude": 17.442292,
        "longitude": 78.357704
      },
      {
        "latitude": 17.442131,
        "longitude": 78.358098
      },
      {
        "latitude": 17.44203,
        "longitude": 78.35832
      },
      {
        "latitude": 17.441932,
        "longitude": 78.358533
      },
      {
        "latitude": 17.44171,
        "longitude": 78.359009
      },
      {
        "latitude": 17.441435,
        "longitude": 78.359541
      },
      {
        "latitude": 17.440915,
        "longitude": 78.360404
      },
      {
        "latitude": 17.440794,
        "longitude": 78.360602
      },
      {
        "latitude": 17.440672,
        "longitude": 78.360801
      },
      {
        "latitude": 17.440416,
        "longitude": 78.361339
      },
      {
        "latitude": 17.440169,
        "longitude": 78.361728
      },
      {
        "latitude": 17.440048,
        "longitude": 78.361926
      },
      {
        "latitude": 17.439822,
        "longitude": 78.36228
      },
      {
        "latitude": 17.439693,
        "longitude": 78.362474
      },
      {
        "latitude": 17.439565,
        "longitude": 78.362667
      },
      {
        "latitude": 17.439436,
        "longitude": 78.362861
      },
      {
        "latitude": 17.439139,
        "longitude": 78.363322
      },
      {
        "latitude": 17.438389,
        "longitude": 78.364378
      },
      {
        "latitude": 17.438237,
        "longitude": 78.364562
      },
      {
        "latitude": 17.438543,
        "longitude": 78.36518
      },
      {
        "latitude": 17.438825,
        "longitude": 78.36544
      },
      {
        "latitude": 17.438994,
        "longitude": 78.365595
      },
      {
        "latitude": 17.439272,
        "longitude": 78.365852
      },
      {
        "latitude": 17.43944,
        "longitude": 78.366009
      },
      {
        "latitude": 17.439677,
        "longitude": 78.366229
      },
      {
        "latitude": 17.439845,
        "longitude": 78.366386
      },
      {
        "latitude": 17.440026,
        "longitude": 78.36655
      },
      {
        "latitude": 17.440362,
        "longitude": 78.366821
      },
      {
        "latitude": 17.440679,
        "longitude": 78.367047
      },
      {
        "latitude": 17.440861,
        "longitude": 78.367217
      },
      {
        "latitude": 17.440814,
        "longitude": 78.368576
      },
      {
        "latitude": 17.440491,
        "longitude": 78.36955
      },
      {
        "latitude": 17.440403,
        "longitude": 78.369922
      },
      {
        "latitude": 17.440353,
        "longitude": 78.370152
      },
      {
        "latitude": 17.440303,
        "longitude": 78.370381
      },
      {
        "latitude": 17.440253,
        "longitude": 78.370611
      },
      {
        "latitude": 17.440203,
        "longitude": 78.370841
      },
      {
        "latitude": 17.440117,
        "longitude": 78.371239
      },
      {
        "latitude": 17.439828,
        "longitude": 78.371825
      },
      {
        "latitude": 17.439657,
        "longitude": 78.372038
      },
      {
        "latitude": 17.439182,
        "longitude": 78.372546
      },
      {
        "latitude": 17.438866,
        "longitude": 78.372826
      },
      {
        "latitude": 17.438601,
        "longitude": 78.373066
      },
      {
        "latitude": 17.438434,
        "longitude": 78.373224
      },
      {
        "latitude": 17.438268,
        "longitude": 78.373383
      },
      {
        "latitude": 17.437893,
        "longitude": 78.373752
      },
      {
        "latitude": 17.43773,
        "longitude": 78.373915
      },
      {
        "latitude": 17.437384,
        "longitude": 78.37426
      },
      {
        "latitude": 17.437194,
        "longitude": 78.374451
      },
      {
        "latitude": 17.437241,
        "longitude": 78.37473
      },
      {
        "latitude": 17.437519,
        "longitude": 78.375039
      },
      {
        "latitude": 17.437827,
        "longitude": 78.375394
      },
      {
        "latitude": 17.437983,
        "longitude": 78.375565
      },
      {
        "latitude": 17.438138,
        "longitude": 78.375735
      },
      {
        "latitude": 17.438506,
        "longitude": 78.37601
      },
      {
        "latitude": 17.438659,
        "longitude": 78.376182
      },
      {
        "latitude": 17.438812,
        "longitude": 78.376355
      },
      {
        "latitude": 17.438965,
        "longitude": 78.376528
      },
      {
        "latitude": 17.439118,
        "longitude": 78.3767
      },
      {
        "latitude": 17.439436,
        "longitude": 78.376921
      },
      {
        "latitude": 17.440226,
        "longitude": 78.377
      },
      {
        "latitude": 17.440451,
        "longitude": 78.377002
      },
      {
        "latitude": 17.440675,
        "longitude": 78.377004
      },
      {
        "latitude": 17.4409,
        "longitude": 78.377007
      },
      {
        "latitude": 17.44116,
        "longitude": 78.377009
      },
      {
        "latitude": 17.441659,
        "longitude": 78.377142
      },
      {
        "latitude": 17.441884,
        "longitude": 78.37714
      },
      {
        "latitude": 17.442108,
        "longitude": 78.377137
      },
      {
        "latitude": 17.44242,
        "longitude": 78.377132
      },
      {
        "latitude": 17.442645,
        "longitude": 78.377127
      },
      {
        "latitude": 17.442869,
        "longitude": 78.377123
      },
      {
        "latitude": 17.443094,
        "longitude": 78.377119
      },
      {
        "latitude": 17.443364,
        "longitude": 78.377112
      },
      {
        "latitude": 17.443738,
        "longitude": 78.377093
      },
      {
        "latitude": 17.444014,
        "longitude": 78.377095
      },
      {
        "latitude": 17.444974,
        "longitude": 78.377184
      },
      {
        "latitude": 17.445196,
        "longitude": 78.377222
      },
      {
        "latitude": 17.44548,
        "longitude": 78.377263
      },
      {
        "latitude": 17.445703,
        "longitude": 78.377294
      },
      {
        "latitude": 17.446595,
        "longitude": 78.377588
      },
      {
        "latitude": 17.446791,
        "longitude": 78.377703
      },
      {
        "latitude": 17.447182,
        "longitude": 78.377936
      },
      {
        "latitude": 17.447821,
        "longitude": 78.378381
      },
      {
        "latitude": 17.447996,
        "longitude": 78.378529
      },
      {
        "latitude": 17.448171,
        "longitude": 78.378677
      },
      {
        "latitude": 17.449303,
        "longitude": 78.379191
      },
      {
        "latitude": 17.449523,
        "longitude": 78.37924
      },
      {
        "latitude": 17.449743,
        "longitude": 78.379289
      },
      {
        "latitude": 17.450866,
        "longitude": 78.379934
      },
      {
        "latitude": 17.450997,
        "longitude": 78.380126
      },
      {
        "latitude": 17.451128,
        "longitude": 78.380317
      },
      {
        "latitude": 17.450697,
        "longitude": 78.380486
      },
      {
        "latitude": 17.450399,
        "longitude": 78.38026
      }
    ]
  },
  {
    "id": "chennai",
    "name": "Chennai",
    "state": "Tamil Nadu",
    "landmark": "OMR IT Corridor & Tidel Park",
    "center": {
      "latitude": 12.989,
      "longitude": 80.248
    },
    "route": [
      {
        "latitude": 12.986296,
        "longitude": 80.247987
      },
      {
        "latitude": 12.986295,
        "longitude": 80.248218
      },
      {
        "latitude": 12.986294,
        "longitude": 80.248448
      },
      {
        "latitude": 12.986292,
        "longitude": 80.248679
      },
      {
        "latitude": 12.986291,
        "longitude": 80.249006
      },
      {
        "latitude": 12.98629,
        "longitude": 80.249236
      },
      {
        "latitude": 12.986289,
        "longitude": 80.249467
      },
      {
        "latitude": 12.986288,
        "longitude": 80.249698
      },
      {
        "latitude": 12.986285,
        "longitude": 80.250277
      },
      {
        "latitude": 12.986284,
        "longitude": 80.250507
      },
      {
        "latitude": 12.986283,
        "longitude": 80.250738
      },
      {
        "latitude": 12.986282,
        "longitude": 80.250969
      },
      {
        "latitude": 12.986281,
        "longitude": 80.2512
      },
      {
        "latitude": 12.986868,
        "longitude": 80.251582
      },
      {
        "latitude": 12.987085,
        "longitude": 80.251524
      },
      {
        "latitude": 12.987303,
        "longitude": 80.251466
      },
      {
        "latitude": 12.987521,
        "longitude": 80.251409
      },
      {
        "latitude": 12.987738,
        "longitude": 80.251351
      },
      {
        "latitude": 12.987504,
        "longitude": 80.251532
      },
      {
        "latitude": 12.987287,
        "longitude": 80.251595
      },
      {
        "latitude": 12.987054,
        "longitude": 80.251655
      },
      {
        "latitude": 12.986836,
        "longitude": 80.251712
      },
      {
        "latitude": 12.986618,
        "longitude": 80.251768
      },
      {
        "latitude": 12.9864,
        "longitude": 80.251825
      },
      {
        "latitude": 12.986079,
        "longitude": 80.251905
      },
      {
        "latitude": 12.985861,
        "longitude": 80.251959
      },
      {
        "latitude": 12.985642,
        "longitude": 80.252013
      },
      {
        "latitude": 12.985424,
        "longitude": 80.252067
      },
      {
        "latitude": 12.985205,
        "longitude": 80.252121
      },
      {
        "latitude": 12.984496,
        "longitude": 80.252302
      },
      {
        "latitude": 12.984277,
        "longitude": 80.252357
      },
      {
        "latitude": 12.984059,
        "longitude": 80.252411
      },
      {
        "latitude": 12.98384,
        "longitude": 80.252466
      },
      {
        "latitude": 12.983622,
        "longitude": 80.252521
      },
      {
        "latitude": 12.983404,
        "longitude": 80.252576
      },
      {
        "latitude": 12.983035,
        "longitude": 80.252636
      },
      {
        "latitude": 12.982515,
        "longitude": 80.252674
      },
      {
        "latitude": 12.982291,
        "longitude": 80.252683
      },
      {
        "latitude": 12.982066,
        "longitude": 80.252691
      },
      {
        "latitude": 12.981772,
        "longitude": 80.252701
      },
      {
        "latitude": 12.981548,
        "longitude": 80.252709
      },
      {
        "latitude": 12.981323,
        "longitude": 80.252716
      },
      {
        "latitude": 12.981098,
        "longitude": 80.252724
      },
      {
        "latitude": 12.980873,
        "longitude": 80.252731
      },
      {
        "latitude": 12.980534,
        "longitude": 80.25274
      },
      {
        "latitude": 12.980249,
        "longitude": 80.252743
      },
      {
        "latitude": 12.980024,
        "longitude": 80.252745
      },
      {
        "latitude": 12.979343,
        "longitude": 80.252681
      },
      {
        "latitude": 12.978952,
        "longitude": 80.252611
      },
      {
        "latitude": 12.9786,
        "longitude": 80.252504
      },
      {
        "latitude": 12.978371,
        "longitude": 80.252384
      },
      {
        "latitude": 12.978154,
        "longitude": 80.252223
      },
      {
        "latitude": 12.977809,
        "longitude": 80.251925
      },
      {
        "latitude": 12.977026,
        "longitude": 80.251404
      },
      {
        "latitude": 12.976693,
        "longitude": 80.251291
      },
      {
        "latitude": 12.976476,
        "longitude": 80.25123
      },
      {
        "latitude": 12.976215,
        "longitude": 80.251164
      },
      {
        "latitude": 12.975432,
        "longitude": 80.250969
      },
      {
        "latitude": 12.975678,
        "longitude": 80.250838
      },
      {
        "latitude": 12.975895,
        "longitude": 80.250899
      },
      {
        "latitude": 12.976112,
        "longitude": 80.250959
      },
      {
        "latitude": 12.976329,
        "longitude": 80.25102
      },
      {
        "latitude": 12.976546,
        "longitude": 80.25108
      },
      {
        "latitude": 12.976763,
        "longitude": 80.25114
      },
      {
        "latitude": 12.977295,
        "longitude": 80.251352
      },
      {
        "latitude": 12.977363,
        "longitude": 80.2512
      },
      {
        "latitude": 12.977313,
        "longitude": 80.250975
      },
      {
        "latitude": 12.977347,
        "longitude": 80.250496
      },
      {
        "latitude": 12.977418,
        "longitude": 80.250278
      },
      {
        "latitude": 12.977504,
        "longitude": 80.25002
      },
      {
        "latitude": 12.977576,
        "longitude": 80.249801
      },
      {
        "latitude": 12.977649,
        "longitude": 80.249583
      },
      {
        "latitude": 12.977306,
        "longitude": 80.248287
      },
      {
        "latitude": 12.977091,
        "longitude": 80.248219
      },
      {
        "latitude": 12.976799,
        "longitude": 80.248132
      },
      {
        "latitude": 12.976582,
        "longitude": 80.24807
      },
      {
        "latitude": 12.976366,
        "longitude": 80.248007
      },
      {
        "latitude": 12.976149,
        "longitude": 80.247944
      },
      {
        "latitude": 12.975933,
        "longitude": 80.247882
      },
      {
        "latitude": 12.975717,
        "longitude": 80.247819
      },
      {
        "latitude": 12.9755,
        "longitude": 80.247756
      },
      {
        "latitude": 12.975284,
        "longitude": 80.247694
      },
      {
        "latitude": 12.975068,
        "longitude": 80.247631
      },
      {
        "latitude": 12.974851,
        "longitude": 80.247568
      },
      {
        "latitude": 12.974635,
        "longitude": 80.247506
      },
      {
        "latitude": 12.974534,
        "longitude": 80.247237
      },
      {
        "latitude": 12.974586,
        "longitude": 80.247012
      },
      {
        "latitude": 12.974661,
        "longitude": 80.246699
      },
      {
        "latitude": 12.974715,
        "longitude": 80.246475
      },
      {
        "latitude": 12.974789,
        "longitude": 80.246204
      },
      {
        "latitude": 12.974851,
        "longitude": 80.245982
      },
      {
        "latitude": 12.974796,
        "longitude": 80.24618
      },
      {
        "latitude": 12.974734,
        "longitude": 80.246402
      },
      {
        "latitude": 12.974512,
        "longitude": 80.24636
      },
      {
        "latitude": 12.974296,
        "longitude": 80.246293
      },
      {
        "latitude": 12.974195,
        "longitude": 80.246503
      },
      {
        "latitude": 12.974145,
        "longitude": 80.246728
      },
      {
        "latitude": 12.974094,
        "longitude": 80.246952
      },
      {
        "latitude": 12.974043,
        "longitude": 80.247177
      },
      {
        "latitude": 12.973992,
        "longitude": 80.247402
      },
      {
        "latitude": 12.973942,
        "longitude": 80.247627
      },
      {
        "latitude": 12.973891,
        "longitude": 80.247851
      },
      {
        "latitude": 12.973837,
        "longitude": 80.248093
      },
      {
        "latitude": 12.973787,
        "longitude": 80.248318
      },
      {
        "latitude": 12.973736,
        "longitude": 80.248543
      },
      {
        "latitude": 12.973686,
        "longitude": 80.248768
      },
      {
        "latitude": 12.973636,
        "longitude": 80.248992
      },
      {
        "latitude": 12.973586,
        "longitude": 80.249217
      },
      {
        "latitude": 12.973535,
        "longitude": 80.249442
      },
      {
        "latitude": 12.973447,
        "longitude": 80.249843
      },
      {
        "latitude": 12.973397,
        "longitude": 80.250068
      },
      {
        "latitude": 12.97359,
        "longitude": 80.250235
      },
      {
        "latitude": 12.973362,
        "longitude": 80.250363
      },
      {
        "latitude": 12.97296,
        "longitude": 80.250271
      },
      {
        "latitude": 12.972702,
        "longitude": 80.250203
      },
      {
        "latitude": 12.972484,
        "longitude": 80.250144
      },
      {
        "latitude": 12.972062,
        "longitude": 80.250032
      },
      {
        "latitude": 12.971637,
        "longitude": 80.249922
      },
      {
        "latitude": 12.971208,
        "longitude": 80.249807
      },
      {
        "latitude": 12.970762,
        "longitude": 80.249654
      },
      {
        "latitude": 12.970551,
        "longitude": 80.249574
      },
      {
        "latitude": 12.970314,
        "longitude": 80.249483
      },
      {
        "latitude": 12.970104,
        "longitude": 80.249402
      },
      {
        "latitude": 12.969893,
        "longitude": 80.249322
      },
      {
        "latitude": 12.969609,
        "longitude": 80.249211
      },
      {
        "latitude": 12.969398,
        "longitude": 80.24913
      },
      {
        "latitude": 12.969188,
        "longitude": 80.249048
      },
      {
        "latitude": 12.968967,
        "longitude": 80.248955
      },
      {
        "latitude": 12.96876,
        "longitude": 80.248867
      },
      {
        "latitude": 12.968367,
        "longitude": 80.248707
      },
      {
        "latitude": 12.967995,
        "longitude": 80.248565
      },
      {
        "latitude": 12.967743,
        "longitude": 80.248467
      },
      {
        "latitude": 12.967533,
        "longitude": 80.248385
      },
      {
        "latitude": 12.967182,
        "longitude": 80.248228
      },
      {
        "latitude": 12.966923,
        "longitude": 80.248099
      },
      {
        "latitude": 12.966616,
        "longitude": 80.247949
      },
      {
        "latitude": 12.966282,
        "longitude": 80.247796
      },
      {
        "latitude": 12.966075,
        "longitude": 80.247705
      },
      {
        "latitude": 12.965869,
        "longitude": 80.247613
      },
      {
        "latitude": 12.965612,
        "longitude": 80.247515
      },
      {
        "latitude": 12.965401,
        "longitude": 80.247437
      },
      {
        "latitude": 12.965163,
        "longitude": 80.247358
      },
      {
        "latitude": 12.964949,
        "longitude": 80.247288
      },
      {
        "latitude": 12.964531,
        "longitude": 80.247138
      },
      {
        "latitude": 12.964161,
        "longitude": 80.246999
      },
      {
        "latitude": 12.96306,
        "longitude": 80.246524
      },
      {
        "latitude": 12.962818,
        "longitude": 80.246404
      },
      {
        "latitude": 12.962615,
        "longitude": 80.246304
      },
      {
        "latitude": 12.962344,
        "longitude": 80.246168
      },
      {
        "latitude": 12.962142,
        "longitude": 80.246067
      },
      {
        "latitude": 12.961741,
        "longitude": 80.245881
      },
      {
        "latitude": 12.961534,
        "longitude": 80.245791
      },
      {
        "latitude": 12.961327,
        "longitude": 80.245702
      },
      {
        "latitude": 12.961103,
        "longitude": 80.245596
      },
      {
        "latitude": 12.960638,
        "longitude": 80.245381
      },
      {
        "latitude": 12.960262,
        "longitude": 80.245218
      },
      {
        "latitude": 12.959912,
        "longitude": 80.245069
      },
      {
        "latitude": 12.959627,
        "longitude": 80.24494
      },
      {
        "latitude": 12.959423,
        "longitude": 80.244844
      },
      {
        "latitude": 12.959218,
        "longitude": 80.244749
      },
      {
        "latitude": 12.959013,
        "longitude": 80.244653
      },
      {
        "latitude": 12.958703,
        "longitude": 80.24452
      },
      {
        "latitude": 12.958495,
        "longitude": 80.244434
      },
      {
        "latitude": 12.958286,
        "longitude": 80.244348
      },
      {
        "latitude": 12.958078,
        "longitude": 80.244261
      },
      {
        "latitude": 12.957578,
        "longitude": 80.244064
      },
      {
        "latitude": 12.957367,
        "longitude": 80.243983
      },
      {
        "latitude": 12.957157,
        "longitude": 80.243901
      },
      {
        "latitude": 12.956779,
        "longitude": 80.243753
      },
      {
        "latitude": 12.956569,
        "longitude": 80.243671
      },
      {
        "latitude": 12.956086,
        "longitude": 80.243459
      },
      {
        "latitude": 12.95588,
        "longitude": 80.243365
      },
      {
        "latitude": 12.955675,
        "longitude": 80.243271
      },
      {
        "latitude": 12.955191,
        "longitude": 80.243062
      },
      {
        "latitude": 12.95423,
        "longitude": 80.242655
      },
      {
        "latitude": 12.954021,
        "longitude": 80.242568
      },
      {
        "latitude": 12.953716,
        "longitude": 80.242442
      },
      {
        "latitude": 12.953507,
        "longitude": 80.242355
      },
      {
        "latitude": 12.953299,
        "longitude": 80.242269
      },
      {
        "latitude": 12.953008,
        "longitude": 80.242158
      },
      {
        "latitude": 12.952797,
        "longitude": 80.24208
      },
      {
        "latitude": 12.952341,
        "longitude": 80.241911
      },
      {
        "latitude": 12.95213,
        "longitude": 80.241833
      },
      {
        "latitude": 12.951918,
        "longitude": 80.241755
      },
      {
        "latitude": 12.951726,
        "longitude": 80.241254
      },
      {
        "latitude": 12.951863,
        "longitude": 80.240992
      },
      {
        "latitude": 12.952216,
        "longitude": 80.24044
      },
      {
        "latitude": 12.952351,
        "longitude": 80.240256
      },
      {
        "latitude": 12.952439,
        "longitude": 80.240007
      },
      {
        "latitude": 12.952471,
        "longitude": 80.23965
      },
      {
        "latitude": 12.952243,
        "longitude": 80.239296
      },
      {
        "latitude": 12.951938,
        "longitude": 80.239233
      },
      {
        "latitude": 12.951605,
        "longitude": 80.239235
      },
      {
        "latitude": 12.951346,
        "longitude": 80.239227
      },
      {
        "latitude": 12.950897,
        "longitude": 80.239268
      },
      {
        "latitude": 12.950567,
        "longitude": 80.239225
      },
      {
        "latitude": 12.950347,
        "longitude": 80.239181
      },
      {
        "latitude": 12.95015,
        "longitude": 80.239381
      },
      {
        "latitude": 12.950112,
        "longitude": 80.239609
      },
      {
        "latitude": 12.950074,
        "longitude": 80.239836
      },
      {
        "latitude": 12.950039,
        "longitude": 80.240015
      },
      {
        "latitude": 12.950082,
        "longitude": 80.23979
      },
      {
        "latitude": 12.95012,
        "longitude": 80.239562
      },
      {
        "latitude": 12.950158,
        "longitude": 80.239335
      },
      {
        "latitude": 12.950532,
        "longitude": 80.239218
      },
      {
        "latitude": 12.950752,
        "longitude": 80.239262
      },
      {
        "latitude": 12.95106,
        "longitude": 80.239267
      },
      {
        "latitude": 12.951269,
        "longitude": 80.238994
      },
      {
        "latitude": 12.951327,
        "longitude": 80.238721
      },
      {
        "latitude": 12.951379,
        "longitude": 80.238497
      },
      {
        "latitude": 12.951603,
        "longitude": 80.238498
      },
      {
        "latitude": 12.952005,
        "longitude": 80.238695
      },
      {
        "latitude": 12.952209,
        "longitude": 80.23879
      },
      {
        "latitude": 12.952744,
        "longitude": 80.238891
      },
      {
        "latitude": 12.953505,
        "longitude": 80.239001
      },
      {
        "latitude": 12.953798,
        "longitude": 80.239091
      },
      {
        "latitude": 12.954135,
        "longitude": 80.239187
      },
      {
        "latitude": 12.954426,
        "longitude": 80.239267
      },
      {
        "latitude": 12.954643,
        "longitude": 80.239328
      },
      {
        "latitude": 12.95486,
        "longitude": 80.239388
      },
      {
        "latitude": 12.955098,
        "longitude": 80.23945
      },
      {
        "latitude": 12.955316,
        "longitude": 80.239505
      },
      {
        "latitude": 12.955535,
        "longitude": 80.239561
      },
      {
        "latitude": 12.955795,
        "longitude": 80.239909
      },
      {
        "latitude": 12.956115,
        "longitude": 80.240102
      },
      {
        "latitude": 12.956395,
        "longitude": 80.240173
      },
      {
        "latitude": 12.956693,
        "longitude": 80.240212
      },
      {
        "latitude": 12.956935,
        "longitude": 80.240236
      },
      {
        "latitude": 12.95769,
        "longitude": 80.240311
      },
      {
        "latitude": 12.957955,
        "longitude": 80.240341
      },
      {
        "latitude": 12.958215,
        "longitude": 80.240374
      },
      {
        "latitude": 12.958462,
        "longitude": 80.240397
      },
      {
        "latitude": 12.959232,
        "longitude": 80.240287
      },
      {
        "latitude": 12.959529,
        "longitude": 80.240308
      },
      {
        "latitude": 12.959991,
        "longitude": 80.240464
      },
      {
        "latitude": 12.96045,
        "longitude": 80.240598
      },
      {
        "latitude": 12.960841,
        "longitude": 80.240682
      },
      {
        "latitude": 12.961067,
        "longitude": 80.240732
      },
      {
        "latitude": 12.961305,
        "longitude": 80.240783
      },
      {
        "latitude": 12.961629,
        "longitude": 80.240853
      },
      {
        "latitude": 12.9619,
        "longitude": 80.240905
      },
      {
        "latitude": 12.962122,
        "longitude": 80.240945
      },
      {
        "latitude": 12.962414,
        "longitude": 80.24099
      },
      {
        "latitude": 12.962636,
        "longitude": 80.241021
      },
      {
        "latitude": 12.962864,
        "longitude": 80.241054
      },
      {
        "latitude": 12.963373,
        "longitude": 80.240795
      },
      {
        "latitude": 12.963426,
        "longitude": 80.24057
      },
      {
        "latitude": 12.963465,
        "longitude": 80.240329
      },
      {
        "latitude": 12.963544,
        "longitude": 80.239969
      },
      {
        "latitude": 12.963602,
        "longitude": 80.239746
      },
      {
        "latitude": 12.964017,
        "longitude": 80.239103
      },
      {
        "latitude": 12.964082,
        "longitude": 80.23883
      },
      {
        "latitude": 12.964157,
        "longitude": 80.238531
      },
      {
        "latitude": 12.964214,
        "longitude": 80.238308
      },
      {
        "latitude": 12.964381,
        "longitude": 80.23773
      },
      {
        "latitude": 12.964427,
        "longitude": 80.237504
      },
      {
        "latitude": 12.964472,
        "longitude": 80.237278
      },
      {
        "latitude": 12.964518,
        "longitude": 80.237053
      },
      {
        "latitude": 12.964564,
        "longitude": 80.236827
      },
      {
        "latitude": 12.96471,
        "longitude": 80.236287
      },
      {
        "latitude": 12.964991,
        "longitude": 80.235793
      },
      {
        "latitude": 12.965061,
        "longitude": 80.23553
      },
      {
        "latitude": 12.965158,
        "longitude": 80.23515
      },
      {
        "latitude": 12.965214,
        "longitude": 80.234926
      },
      {
        "latitude": 12.965042,
        "longitude": 80.234659
      },
      {
        "latitude": 12.965163,
        "longitude": 80.235126
      },
      {
        "latitude": 12.965107,
        "longitude": 80.23535
      },
      {
        "latitude": 12.965044,
        "longitude": 80.235596
      },
      {
        "latitude": 12.964935,
        "longitude": 80.235972
      },
      {
        "latitude": 12.965146,
        "longitude": 80.236028
      },
      {
        "latitude": 12.96538,
        "longitude": 80.236052
      },
      {
        "latitude": 12.965903,
        "longitude": 80.236094
      },
      {
        "latitude": 12.966407,
        "longitude": 80.236119
      },
      {
        "latitude": 12.966695,
        "longitude": 80.23618
      },
      {
        "latitude": 12.966955,
        "longitude": 80.236248
      },
      {
        "latitude": 12.967173,
        "longitude": 80.236305
      },
      {
        "latitude": 12.967391,
        "longitude": 80.236361
      },
      {
        "latitude": 12.967478,
        "longitude": 80.236686
      },
      {
        "latitude": 12.967522,
        "longitude": 80.236951
      },
      {
        "latitude": 12.967561,
        "longitude": 80.237179
      },
      {
        "latitude": 12.967599,
        "longitude": 80.237406
      },
      {
        "latitude": 12.967649,
        "longitude": 80.237712
      },
      {
        "latitude": 12.967686,
        "longitude": 80.237939
      },
      {
        "latitude": 12.967761,
        "longitude": 80.238364
      },
      {
        "latitude": 12.967804,
        "longitude": 80.238591
      },
      {
        "latitude": 12.967848,
        "longitude": 80.238817
      },
      {
        "latitude": 12.967891,
        "longitude": 80.239044
      },
      {
        "latitude": 12.967934,
        "longitude": 80.23927
      },
      {
        "latitude": 12.967977,
        "longitude": 80.239496
      },
      {
        "latitude": 12.968021,
        "longitude": 80.239723
      },
      {
        "latitude": 12.968046,
        "longitude": 80.240313
      },
      {
        "latitude": 12.96802,
        "longitude": 80.240542
      },
      {
        "latitude": 12.967994,
        "longitude": 80.240771
      },
      {
        "latitude": 12.967968,
        "longitude": 80.241001
      },
      {
        "latitude": 12.967942,
        "longitude": 80.24123
      },
      {
        "latitude": 12.967938,
        "longitude": 80.241616
      },
      {
        "latitude": 12.967951,
        "longitude": 80.241847
      },
      {
        "latitude": 12.967967,
        "longitude": 80.242194
      },
      {
        "latitude": 12.967987,
        "longitude": 80.242525
      },
      {
        "latitude": 12.968031,
        "longitude": 80.242758
      },
      {
        "latitude": 12.968074,
        "longitude": 80.242985
      },
      {
        "latitude": 12.968118,
        "longitude": 80.243211
      },
      {
        "latitude": 12.968198,
        "longitude": 80.244055
      },
      {
        "latitude": 12.967997,
        "longitude": 80.24465
      },
      {
        "latitude": 12.96783,
        "longitude": 80.244949
      },
      {
        "latitude": 12.967643,
        "longitude": 80.245268
      },
      {
        "latitude": 12.967521,
        "longitude": 80.245462
      },
      {
        "latitude": 12.967287,
        "longitude": 80.246103
      },
      {
        "latitude": 12.967214,
        "longitude": 80.246322
      },
      {
        "latitude": 12.967079,
        "longitude": 80.246771
      },
      {
        "latitude": 12.967011,
        "longitude": 80.246993
      },
      {
        "latitude": 12.966944,
        "longitude": 80.247214
      },
      {
        "latitude": 12.966859,
        "longitude": 80.247512
      },
      {
        "latitude": 12.966796,
        "longitude": 80.247733
      },
      {
        "latitude": 12.966945,
        "longitude": 80.247986
      },
      {
        "latitude": 12.967149,
        "longitude": 80.248082
      },
      {
        "latitude": 12.967484,
        "longitude": 80.248233
      },
      {
        "latitude": 12.967858,
        "longitude": 80.248391
      },
      {
        "latitude": 12.968214,
        "longitude": 80.248531
      },
      {
        "latitude": 12.968425,
        "longitude": 80.248611
      },
      {
        "latitude": 12.968773,
        "longitude": 80.248746
      },
      {
        "latitude": 12.968983,
        "longitude": 80.248828
      },
      {
        "latitude": 12.969194,
        "longitude": 80.248909
      },
      {
        "latitude": 12.969445,
        "longitude": 80.249005
      },
      {
        "latitude": 12.969862,
        "longitude": 80.249162
      },
      {
        "latitude": 12.970073,
        "longitude": 80.249242
      },
      {
        "latitude": 12.97032,
        "longitude": 80.249332
      },
      {
        "latitude": 12.970532,
        "longitude": 80.24941
      },
      {
        "latitude": 12.970932,
        "longitude": 80.249554
      },
      {
        "latitude": 12.971503,
        "longitude": 80.249692
      },
      {
        "latitude": 12.971721,
        "longitude": 80.249748
      },
      {
        "latitude": 12.971939,
        "longitude": 80.249805
      },
      {
        "latitude": 12.972157,
        "longitude": 80.249861
      },
      {
        "latitude": 12.972375,
        "longitude": 80.249918
      },
      {
        "latitude": 12.972815,
        "longitude": 80.250034
      },
      {
        "latitude": 12.973187,
        "longitude": 80.25013
      },
      {
        "latitude": 12.97359,
        "longitude": 80.250235
      },
      {
        "latitude": 12.974,
        "longitude": 80.250348
      },
      {
        "latitude": 12.974216,
        "longitude": 80.250412
      },
      {
        "latitude": 12.974432,
        "longitude": 80.250476
      },
      {
        "latitude": 12.974648,
        "longitude": 80.25054
      },
      {
        "latitude": 12.974864,
        "longitude": 80.250604
      },
      {
        "latitude": 12.975142,
        "longitude": 80.250685
      },
      {
        "latitude": 12.975409,
        "longitude": 80.250763
      },
      {
        "latitude": 12.975678,
        "longitude": 80.250838
      },
      {
        "latitude": 12.975895,
        "longitude": 80.250899
      },
      {
        "latitude": 12.976112,
        "longitude": 80.250959
      },
      {
        "latitude": 12.976329,
        "longitude": 80.25102
      },
      {
        "latitude": 12.976546,
        "longitude": 80.25108
      },
      {
        "latitude": 12.976763,
        "longitude": 80.25114
      },
      {
        "latitude": 12.977295,
        "longitude": 80.251352
      },
      {
        "latitude": 12.977863,
        "longitude": 80.251778
      },
      {
        "latitude": 12.978097,
        "longitude": 80.251972
      },
      {
        "latitude": 12.978439,
        "longitude": 80.252225
      },
      {
        "latitude": 12.978803,
        "longitude": 80.252391
      },
      {
        "latitude": 12.979152,
        "longitude": 80.252477
      },
      {
        "latitude": 12.979454,
        "longitude": 80.252524
      },
      {
        "latitude": 12.979777,
        "longitude": 80.252584
      },
      {
        "latitude": 12.980211,
        "longitude": 80.25262
      },
      {
        "latitude": 12.980435,
        "longitude": 80.252631
      },
      {
        "latitude": 12.980696,
        "longitude": 80.252626
      },
      {
        "latitude": 12.98092,
        "longitude": 80.252619
      },
      {
        "latitude": 12.981145,
        "longitude": 80.252613
      },
      {
        "latitude": 12.98137,
        "longitude": 80.252606
      },
      {
        "latitude": 12.981595,
        "longitude": 80.252599
      },
      {
        "latitude": 12.982218,
        "longitude": 80.252583
      },
      {
        "latitude": 12.982443,
        "longitude": 80.25258
      },
      {
        "latitude": 12.982667,
        "longitude": 80.252576
      },
      {
        "latitude": 12.98305,
        "longitude": 80.252539
      },
      {
        "latitude": 12.983501,
        "longitude": 80.25245
      },
      {
        "latitude": 12.983719,
        "longitude": 80.252394
      },
      {
        "latitude": 12.983937,
        "longitude": 80.252339
      },
      {
        "latitude": 12.984156,
        "longitude": 80.252283
      },
      {
        "latitude": 12.984374,
        "longitude": 80.252227
      },
      {
        "latitude": 12.984592,
        "longitude": 80.252171
      },
      {
        "latitude": 12.985148,
        "longitude": 80.252027
      },
      {
        "latitude": 12.985366,
        "longitude": 80.25197
      },
      {
        "latitude": 12.985584,
        "longitude": 80.251913
      },
      {
        "latitude": 12.985802,
        "longitude": 80.251856
      },
      {
        "latitude": 12.986019,
        "longitude": 80.251799
      },
      {
        "latitude": 12.986237,
        "longitude": 80.251742
      },
      {
        "latitude": 12.986198,
        "longitude": 80.251346
      },
      {
        "latitude": 12.986192,
        "longitude": 80.251072
      },
      {
        "latitude": 12.986192,
        "longitude": 80.250842
      },
      {
        "latitude": 12.986192,
        "longitude": 80.250611
      },
      {
        "latitude": 12.986193,
        "longitude": 80.250187
      },
      {
        "latitude": 12.986193,
        "longitude": 80.249957
      },
      {
        "latitude": 12.986194,
        "longitude": 80.249656
      },
      {
        "latitude": 12.986194,
        "longitude": 80.249261
      },
      {
        "latitude": 12.986195,
        "longitude": 80.249031
      },
      {
        "latitude": 12.986195,
        "longitude": 80.2488
      },
      {
        "latitude": 12.986199,
        "longitude": 80.248421
      },
      {
        "latitude": 12.986202,
        "longitude": 80.248191
      },
      {
        "latitude": 12.986206,
        "longitude": 80.24796
      },
      {
        "latitude": 12.986209,
        "longitude": 80.247729
      },
      {
        "latitude": 12.986297,
        "longitude": 80.247735
      },
      {
        "latitude": 12.986296,
        "longitude": 80.247965
      }
    ]
  }
];

// Default simulated route (backward-compatibility)
export const SIMULATED_ROUTE: Omit<Coordinate, 'timestamp'>[] = INDIAN_SIMULATION_ROUTES[0].route;
