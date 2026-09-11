import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  imports: [FormsModule, CdkDropList, CdkDrag],
  template: `
    <div cdkDropList cdkDropListOrientation="horizontal" (cdkDropListDropped)="onDrop($event)"
         class="flex flex-wrap gap-1.5 rounded border border-slate-300 p-1.5">
      @for (tag of values(); track $index) {
        @if (editingIndex() === $index) {
          <input type="text" autofocus [(ngModel)]="editDraft"
                 (keydown.enter)="commitEdit($index)" (keydown.escape)="cancelEdit()" (blur)="commitEdit($index)"
                 (focus)="$any($event.target).select()"
                 class="min-w-[4rem] rounded border border-indigo-300 px-1 py-0.5 text-xs outline-none" />
        } @else {
          <span cdkDrag (dblclick)="startEdit($index)" class="flex cursor-move items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {{ tag }}
            <button type="button" (click)="remove($index)" class="text-slate-400 hover:text-slate-700">×</button>
          </span>
        }
      }
      <input
        type="text"
        [placeholder]="placeholder()"
        [(ngModel)]="draft"
        (keydown.enter)="commit($event)"
        (blur)="commitDraft()"
        class="min-w-[6rem] flex-1 border-0 px-1 py-0.5 text-sm outline-none"
      />
    </div>
  `,
})
export class TagInput {
  readonly values = model.required<string[]>();
  readonly placeholder = input('Ajouter...');

  draft = '';

  readonly editingIndex = signal<number | null>(null);
  editDraft = '';

  startEdit(index: number): void {
    this.editingIndex.set(index);
    this.editDraft = this.values()[index];
  }

  commitEdit(index: number): void {
    if (this.editingIndex() !== index) return;
    const value = this.editDraft.trim();
    const next = [...this.values()];
    if (value) {
      next[index] = value;
    } else {
      next.splice(index, 1);
    }
    this.values.set(next);
    this.editingIndex.set(null);
  }

  cancelEdit(): void {
    this.editingIndex.set(null);
  }

  commit(event: Event): void {
    event.preventDefault();
    this.commitDraft();
  }

  commitDraft(): void {
    const value = this.draft.trim();
    if (!value) return;
    this.values.set([...this.values(), value]);
    this.draft = '';
  }

  remove(index: number): void {
    this.values.set(this.values().filter((_, i) => i !== index));
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    const next = [...this.values()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.values.set(next);
  }
}
