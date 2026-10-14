import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filter-by-type',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-by-type.component.html',
  styleUrls: ['./filter-by-type.component.css']
})
export class FilterByTypeComponent {
  @Input() allTypes: string[] = [];
  @Input() selectedType: string = '';
  
  @Output() typeChange = new EventEmitter<string>();

  onTypeSelect(type: string): void {
    this.typeChange.emit(type);
  }
}