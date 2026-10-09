// rooms/index.js — room registry: definitions for the map UI + class lookup.
import { MainHall } from './mainHall.js';
import { Bedroom } from './bedroom.js';
import { Bathroom } from './bathroom.js';
import { DiningRoom } from './diningRoom.js';
import { DressRoom } from './dressRoom.js';
import { Playroom } from './playroom.js';
import { Kitchen } from './kitchen.js';
import { Hospital } from './hospital.js';
import { DiaperRoom } from './diaperRoom.js';
import { Playground } from './playground.js';
import { ArtRoom } from './artRoom.js';
import { MusicRoom } from './musicRoom.js';
import { Classroom } from './classroom.js';
import { LaundryRoom } from './laundryRoom.js';
import { Shop } from './shop.js';
import { BirthdayRoom } from './birthdayRoom.js';
import { SwimmingPool } from './swimmingPool.js';
import { PetRoom } from './petRoom.js';
import { PuzzleRoom } from './puzzleRoom.js';
import { StoryRoom } from './storyRoom.js';

export const ROOMS = {
  mainHall: MainHall,
  bedroom: Bedroom,
  bathroom: Bathroom,
  diningRoom: DiningRoom,
  dressRoom: DressRoom,
  playroom: Playroom,
  kitchen: Kitchen,
  hospital: Hospital,
  diaperRoom: DiaperRoom,
  playground: Playground,
  artRoom: ArtRoom,
  musicRoom: MusicRoom,
  classroom: Classroom,
  laundryRoom: LaundryRoom,
  shop: Shop,
  birthdayRoom: BirthdayRoom,
  swimmingPool: SwimmingPool,
  petRoom: PetRoom,
  puzzleRoom: PuzzleRoom,
  storyRoom: StoryRoom,
};

export const ROOM_DEFS = [
  { id: 'mainHall',      nameAr: 'الصالة الرئيسية',   nameEn: 'Main Hall',      emoji: '🏡', color: '#7c4dff', color2: '#448aff' },
  { id: 'bedroom',       nameAr: 'غرفة النوم',        nameEn: 'Bedroom',        emoji: '🛏️', color: '#5c6bc0', color2: '#7986cb' },
  { id: 'bathroom',      nameAr: 'الاستحمام',         nameEn: 'Bathroom',       emoji: '🛁', color: '#26c6da', color2: '#4dd0e1' },
  { id: 'diningRoom',    nameAr: 'غرفة الطعام',       nameEn: 'Dining Room',    emoji: '🍽️', color: '#ff9f43', color2: '#ffc93c' },
  { id: 'dressRoom',     nameAr: 'غرفة الملابس',      nameEn: 'Dress Up',       emoji: '👕', color: '#ff6b6b', color2: '#ff6fb5' },
  { id: 'playroom',      nameAr: 'غرفة الألعاب',      nameEn: 'Playroom',       emoji: '🧸', color: '#3ddc84', color2: '#26c6da' },
  { id: 'kitchen',       nameAr: 'المطبخ',            nameEn: 'Kitchen',        emoji: '🍳', color: '#ffb300', color2: '#ffa000' },
  { id: 'hospital',      nameAr: 'عيادة الطبيب',      nameEn: 'Hospital',       emoji: '🩺', color: '#ef5350', color2: '#ff8a80' },
  { id: 'diaperRoom',    nameAr: 'تغيير الحفاضات',    nameEn: 'Diaper Room',    emoji: '🧷', color: '#26a69a', color2: '#80cbc4' },
  { id: 'playground',    nameAr: 'الحديقة الخارجية',  nameEn: 'Playground',     emoji: '🌳', color: '#43a047', color2: '#7cb342' },
  { id: 'artRoom',       nameAr: 'غرفة الرسم',        nameEn: 'Art Room',       emoji: '🎨', color: '#ff6fb5', color2: '#ba68c8' },
  { id: 'musicRoom',     nameAr: 'غرفة الموسيقى',     nameEn: 'Music Room',     emoji: '🎹', color: '#7c4dff', color2: '#5c6bc0' },
  { id: 'classroom',     nameAr: 'غرفة التعليم',      nameEn: 'Classroom',      emoji: '📚', color: '#448aff', color2: '#26c6da' },
  { id: 'laundryRoom',   nameAr: 'غرفة الغسيل',       nameEn: 'Laundry',        emoji: '🧺', color: '#00acc1', color2: '#26c6da' },
  { id: 'shop',          nameAr: 'المتجر',            nameEn: 'Baby Shop',      emoji: '🛒', color: '#ffb300', color2: '#ff7043' },
  { id: 'birthdayRoom',  nameAr: 'أعياد الميلاد',     nameEn: 'Birthday Room',  emoji: '🎂', color: '#ff6b6b', color2: '#ffd54f' },
  { id: 'swimmingPool',  nameAr: 'المسبح',            nameEn: 'Swimming Pool',  emoji: '🏊', color: '#00bcd4', color2: '#4dd0e1' },
  { id: 'petRoom',       nameAr: 'الحيوانات الأليفة', nameEn: 'Pet Room',       emoji: '🐶', color: '#8bc34a', color2: '#aed581' },
  { id: 'puzzleRoom',    nameAr: 'غرفة الألغاز',      nameEn: 'Puzzle Room',    emoji: '🧩', color: '#7e57c2', color2: '#9575cd' },
  { id: 'storyRoom',     nameAr: 'غرفة القصص',        nameEn: 'Story Room',     emoji: '📖', color: '#8d6e63', color2: '#a1887f' },
];
