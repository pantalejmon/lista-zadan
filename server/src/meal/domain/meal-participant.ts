// Kto je dany posiłek i w ilu porcjach. `portions` to mnożnik porcji przepisu
// (0,5 = pół porcji, 2 = dokładka), bo w domu rzadko wszyscy jedzą tyle samo.
// Pusta lista uczestników znaczy „nieprzypisany" — posiłek nie wchodzi wtedy do
// bilansu, ale nadal liczy się do zakupów i spiżarni.
export interface MealParticipant {
  readonly userId: string;
  readonly portions: number;
}
